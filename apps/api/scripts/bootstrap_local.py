"""Create keys and a restricted login on an existing LOCAL PostGIS server."""

import os
import secrets

from psycopg import sql
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

from bluesteps_api.cli import ROOT, generate_local_env, migrate

url = os.environ["BLUESTEPS_MIGRATION_DATABASE_URL"]
parsed = make_url(url)
if parsed.host not in ("localhost", "127.0.0.1", "::1"):
    raise ValueError("This helper only accepts a local database")
target = ROOT / "apps/api/.env"
if target.exists():
    raise ValueError("Existing apps/api/.env found; refusing to overwrite it")
migrate(url)
login = "bluesteps_local_" + secrets.token_hex(6)
password = secrets.token_urlsafe(36)
engine = create_engine(url, hide_parameters=True)
try:
    with engine.begin() as connection:
        driver = connection.connection.driver_connection
        assert driver is not None
        driver.execute(
            sql.SQL("create role {} login password {} nosuperuser nocreatedb nocreaterole nobypassrls").format(
                sql.Identifier(login), sql.Literal(password)
            )
        )
        driver.execute(sql.SQL("grant bluesteps_runtime to {}").format(sql.Identifier(login)))
finally:
    engine.dispose()
runtime = parsed.set(username=login, password=password).render_as_string(hide_password=False)
generate_local_env(target)
source = target.read_text(encoding="utf-8")
source = source.replace("postgresql+psycopg://REPLACE_RUNTIME_LOGIN:REPLACE_PASSWORD@127.0.0.1:54322/postgres", runtime)
target.write_text(source + f"BLUESTEPS_MIGRATION_DATABASE_URL='{url}'\n", encoding="utf-8")
print("Local backend configured with no seeded business data. Run pnpm api:dev and pnpm api:worker.")
