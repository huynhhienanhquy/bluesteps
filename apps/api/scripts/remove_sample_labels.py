"""Remove sample wording from presentation data without changing identifiers or relationships."""

import argparse
import json
import re
from pathlib import Path
from typing import Any

import psycopg
from dotenv import dotenv_values
from psycopg import sql
from psycopg.types.json import Jsonb
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[3]
PRESENTATION_COLUMNS = {
    "name",
    "display_name",
    "bio",
    "device_label",
    "title",
    "body",
    "description",
    "summary",
    "address",
    "area",
    "hours",
    "location",
    "topic",
    "review_reason",
    "steps",
    "sources",
    "blocks",
    "details",
}


def clean_value(value: Any) -> Any:
    if isinstance(value, str):
        if not re.search(r"\bmẫu\b", value, flags=re.IGNORECASE):
            return value
        value = re.sub(r"\[\s*mẫu\s*\][ \t]*", "", value, flags=re.IGNORECASE)
        value = re.sub(r"\bmẫu\b[ \t]*", "", value, flags=re.IGNORECASE)
        value = re.sub(r"[ \t]+([,.;:!?])", r"\1", value)
        return re.sub(r"[ \t]{2,}", " ", value).strip()
    if isinstance(value, list):
        return [clean_value(item) for item in value]
    if isinstance(value, dict):
        return {key: clean_value(item) for key, item in value.items()}
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    config = dotenv_values(ROOT / "apps/api/.env")
    url = make_url(config["BLUESTEPS_MIGRATION_DATABASE_URL"] or "")
    if url.host not in ("localhost", "127.0.0.1", "::1") and not args.allow_remote:
        raise ValueError("Remote cleanup requires --allow-remote")
    options: dict[str, Any] = dict(url.query)
    options.update(
        host=url.host,
        port=url.port or 5432,
        dbname=url.database,
        user=url.username,
        password=url.password,
        connect_timeout=10,
        prepare_threshold=None,
    )
    with psycopg.connect(**options) as conn:
        conn.execute("set local lock_timeout='10s'")
        conn.execute("set local statement_timeout='30s'")
        conn.execute("select pg_advisory_xact_lock(72192620261104)")
        keys: dict[str, list[str]] = {}
        for table, column in conn.execute("""select c.relname,a.attname from pg_index i
            join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace
            cross join lateral unnest(i.indkey) with ordinality k(attnum,ord)
            join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum
            where n.nspname='app_private' and i.indisprimary order by c.relname,k.ord"""):
            keys.setdefault(table, []).append(column)
        columns: dict[str, dict[str, str]] = {}
        for table, name, kind in conn.execute("""select table_name,column_name,data_type
            from information_schema.columns where table_schema='app_private'
            and data_type in ('text','character varying','jsonb') order by table_name,ordinal_position"""):
            if name in PRESENTATION_COLUMNS:
                columns.setdefault(table, {})[name] = kind
        updated = {}
        scanned = 0
        for table, fields in columns.items():
            selected = keys[table] + list(fields)
            read = sql.SQL("select {} from app_private.{}").format(
                sql.SQL(",").join(map(sql.Identifier, selected)), sql.Identifier(table)
            )
            changed = 0
            records = conn.execute(read).fetchall()
            scanned += len(records)
            for values in records:
                record = dict(zip(selected, values, strict=True))
                changes = {
                    name: clean_value(record[name]) for name in fields if clean_value(record[name]) != record[name]
                }
                if not changes:
                    continue
                statement = sql.SQL("update app_private.{} set {} where {}").format(
                    sql.Identifier(table),
                    sql.SQL(",").join(sql.SQL("{}=%s").format(sql.Identifier(name)) for name in changes),
                    sql.SQL(" and ").join(sql.SQL("{}=%s").format(sql.Identifier(key)) for key in keys[table]),
                )
                params = [Jsonb(value) if fields[name] == "jsonb" else value for name, value in changes.items()]
                conn.execute(statement, params + [record[key] for key in keys[table]])
                changed += 1
            # Check every presentation value, including nested JSON, after the updates.
            for values in conn.execute(read):
                record = dict(zip(selected, values, strict=True))
                if any(clean_value(record[name]) != record[name] for name in fields):
                    raise ValueError(f"Presentation cleanup incomplete in {table}")
            if changed:
                updated[table] = changed
        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
    report = {
        "dry_run": args.dry_run,
        "tables_scanned": len(columns),
        "rows_scanned": scanned,
        "rows_updated": sum(updated.values()),
        "tables_updated": updated,
        "remaining_labels": 0,
    }
    if not args.dry_run:
        (ROOT / "docs/label-cleanup-verification.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps(report))


if __name__ == "__main__":
    main()
