import tempfile
import unittest
from pathlib import Path

from jjangdol.filter import OutputFilter
from jjangdol.sentences import split_sentences

CONFIG = """
[settings]
enabled = true
replacement = "패스"

[categories.self_harm]
enabled = true
patterns = ["자살(?!골)", "자해"]

[categories.off]
enabled = false
patterns = ["끈카테고리"]
"""


def make_filter(text: str) -> OutputFilter:
    path = Path(tempfile.mkdtemp()) / "filter.toml"
    path.write_text(text, encoding="utf-8")
    return OutputFilter(path)


class FilterTest(unittest.TestCase):
    def setUp(self):
        self.flt = make_filter(CONFIG)

    def test_blocks_pattern(self):
        r = self.flt.check("야 자해 같은 소리 하지 마")
        self.assertFalse(r.allowed)
        self.assertEqual(r.category, "self_harm")

    def test_blocks_spaced_variant(self):
        self.assertFalse(self.flt.check("자 . 살").allowed)

    def test_negative_lookahead(self):
        self.assertTrue(self.flt.check("아 자살골 넣었네 ㅋㅋ").allowed)

    def test_profanity_is_not_filtered(self):
        self.assertTrue(self.flt.check("아 ㅅㅂ 또 죽었냐 ㅋㅋ").allowed)

    def test_disabled_category(self):
        self.assertTrue(self.flt.check("끈카테고리").allowed)

    def test_master_switch(self):
        flt = make_filter(CONFIG.replace("enabled = true", "enabled = false", 1))
        self.assertTrue(flt.check("자해").allowed)

    def test_bad_regex_reports_location(self):
        with self.assertRaisesRegex(ValueError, "self_harm"):
            make_filter(CONFIG.replace('"자해"', '"자해("'))

    def test_shipped_config_loads(self):
        root = Path(__file__).resolve().parent.parent
        OutputFilter(root / "config" / "filter.toml")


class SentenceTest(unittest.TestCase):
    def test_split_streaming_chunks(self):
        chunks = ["안녕 아빠. 오늘", " 뭐함? ㅋㅋ"]
        self.assertEqual(list(split_sentences(chunks)), ["안녕 아빠.", " 오늘 뭐함?", " ㅋㅋ"])

    def test_decimal_not_split(self):
        self.assertEqual(list(split_sentences(["3.5배 빨라짐"])), ["3.5배 빨라짐"])

    def test_newline_split(self):
        self.assertEqual(list(split_sentences(["첫줄\n둘째줄"])), ["첫줄\n", "둘째줄"])


if __name__ == "__main__":
    unittest.main()
