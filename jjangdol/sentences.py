"""스트리밍으로 들어오는 텍스트를 문장 단위로 끊는다.

필터도 문장 단위로 검사하고, 나중에 붙일 TTS도 문장 단위로 읽는다.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Iterator

# 문장 끝 = 마침표·물음표 등 뒤에 공백이 오는 곳, 또는 줄바꿈.
# 뒤에 공백이 와야 끊으니까 "3.5배" 같은 숫자는 안 잘림.
_SENTENCE = re.compile(r".+?(?:[.!?…~]+(?=\s)|\n)", re.S)


def split_sentences(chunks: Iterable[str]) -> Iterator[str]:
    buf = ""
    for chunk in chunks:
        buf += chunk
        while m := _SENTENCE.match(buf):
            yield m.group(0)
            buf = buf[m.end():]
    if buf.strip():
        yield buf
