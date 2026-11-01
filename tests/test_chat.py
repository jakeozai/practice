import io
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace

from jjangdol.chat import REFUSAL_LINE, Jjangdol
from tests.test_filter import CONFIG, make_filter


class FakeStream:
    def __init__(self, chunks, stop_reason="end_turn"):
        self.text_stream = iter(chunks)
        self._final = SimpleNamespace(
            stop_reason=stop_reason,
            stop_details=None,
            content=[{"type": "text", "text": "".join(chunks)}],
        )

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def get_final_message(self):
        return self._final


class FakeClient:
    def __init__(self, stream):
        self.calls = []
        self.messages = SimpleNamespace(stream=self._stream)
        self._next = stream

    def _stream(self, **kwargs):
        self.calls.append(kwargs)
        return self._next


def make_bot(stream, extra_system=""):
    bot = Jjangdol(extra_system=extra_system)
    bot.client = FakeClient(stream)
    bot.filter = make_filter(CONFIG)
    return bot


class ChatTest(unittest.TestCase):
    def test_filtered_sentence_is_replaced_and_history_kept(self):
        bot = make_bot(FakeStream(["아 ㅅㅂ 또 죽었냐. ", "자해 드립. ", "딸내미나 봐"]))
        out = io.StringIO()
        with redirect_stdout(out):
            bot.reply("나 또 죽었어")

        printed = out.getvalue()
        self.assertIn("아 ㅅㅂ 또 죽었냐.", printed)
        self.assertIn("패스", printed)
        self.assertNotIn("자해", printed)
        self.assertIn("딸내미나 봐", printed)

        self.assertEqual([m["role"] for m in bot.history], ["user", "assistant"])
        self.assertTrue(bot.history[0]["content"].endswith("나 또 죽었어"))
        call = bot.client.calls[0]
        self.assertEqual(call["output_config"], {"effort": "low"})
        self.assertNotIn("{profile}", call["system"])

    def test_respond_yields_sentences(self):
        bot = make_bot(FakeStream(["첫 문장. ", "둘째 문장"]))
        self.assertEqual(list(bot.respond("안녕")), ["첫 문장.", "둘째 문장"])

    def test_refusal_drops_turn(self):
        bot = make_bot(FakeStream([], stop_reason="refusal"))
        self.assertEqual(list(bot.respond("뭐라도")), [REFUSAL_LINE])
        self.assertEqual(bot.history, [])

    def test_error_drops_turn(self):
        bot = make_bot(None)

        def boom(**kwargs):
            raise RuntimeError("network")

        bot.client.messages = SimpleNamespace(stream=boom)
        with self.assertRaises(RuntimeError):
            list(bot.respond("안녕"))
        self.assertEqual(bot.history, [])

    def test_interrupted_turn_is_dropped(self):
        bot = make_bot(FakeStream(["첫 문장. ", "둘째 문장. ", "셋째"]))
        replies = bot.respond("안녕")
        next(replies)
        replies.close()  # 음성 모드에서 아빠가 끼어든 경우
        self.assertEqual(bot.history, [])

    def test_extra_system_is_appended(self):
        bot = make_bot(FakeStream(["응"]), extra_system="[음성 모드]")
        list(bot.respond("안녕"))
        self.assertTrue(bot.client.calls[0]["system"].rstrip().endswith("[음성 모드]"))


if __name__ == "__main__":
    unittest.main()
