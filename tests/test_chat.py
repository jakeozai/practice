import io
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace

from jjangdol.chat import Jjangdol
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


def make_bot(stream):
    bot = Jjangdol()
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

    def test_refusal_drops_turn(self):
        bot = make_bot(FakeStream([], stop_reason="refusal"))
        with redirect_stdout(io.StringIO()):
            bot.reply("뭐라도")
        self.assertEqual(bot.history, [])

    def test_error_drops_turn(self):
        bot = make_bot(None)

        def boom(**kwargs):
            raise RuntimeError("network")

        bot.client.messages = SimpleNamespace(stream=boom)
        with redirect_stdout(io.StringIO()), self.assertRaises(RuntimeError):
            bot.reply("안녕")
        self.assertEqual(bot.history, [])


if __name__ == "__main__":
    unittest.main()
