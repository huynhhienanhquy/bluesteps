import unicodedata
from collections.abc import Sequence


def text_search(query: str, columns: Sequence[str]) -> tuple[str, dict[str, str]]:
    """Case/accent insensitive literal search; SQL expressions are internal call-site constants."""
    folded = "".join(
        char for char in unicodedata.normalize("NFD", query.strip().lower()) if not unicodedata.combining(char)
    ).replace("đ", "d")
    literal = folded.replace("#", "##").replace("%", "#%").replace("_", "#_")
    condition = " or ".join(
        f"translate(regexp_replace(normalize(lower(coalesce({column},'')),NFD),:search_marks,'','g'),'đ','d') like :search_pattern escape '#'"
        for column in columns
    )
    return f"({condition})", {"search_marks": "[\u0300-\u036f]", "search_pattern": f"%{literal}%"}
