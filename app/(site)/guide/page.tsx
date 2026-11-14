import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { minWageKrw } from "@/lib/jobs/min-wage";

export const metadata = { title: `해외 일감 이용 안내 — ${BRAND.name}` };

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-bold">{children}</h2>;
}

/** Notes for people taking overseas gigs, and what 덕잡 is (and isn't) responsible for. Not legal or tax advice. */
export default function GuidePage() {
  const b = BRAND.name;
  return (
    <article className="card leading-relaxed [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-2xl font-extrabold tracking-tight">해외 일감 이용 안내</h1>
      <p className="text-sm text-muted">2026년 11월 기준 · 일반적인 안내이며 법률·세무 자문이 아니에요.</p>

      <H2>{b}의 역할과 책임</H2>
      <ul>
        <li>
          {b}은 공개된 일감 공고를 찾아 한국어로 요약하고 원문 링크를 보내는 정보 서비스예요. 일감의 당사자(의뢰인이나 중개인)가
          아니에요.
        </li>
        <li>지원, 계약, 작업, 대금 받기, 세금 신고는 이용자가 원문 플랫폼과 의뢰인 사이에서 직접 판단하고 책임져요.</li>
        <li>
          {b}은 공고 내용이 정확한지, 의뢰인을 믿을 수 있는지, 대금이 지급되는지, 지원 결과가 어떨지 보장하지 않으며, 이로 생긴 손해를
          책임지지 않아요. 다만 {b}의 고의나 중대한 과실로 생긴 손해는 예외예요.
        </li>
        <li>보수, 지원 가능 국가, 마감 같은 조건은 항상 원문 공고가 기준이에요.</li>
      </ul>

      <H2>지원하기 전에</H2>
      <ul>
        <li>원문에서 한국 거주자도 지원할 수 있는지 다시 확인하세요.</li>
        <li>돈을 먼저 내라고 하거나, 메신저로만 연락하자고 하거나, 신분증·계좌를 먼저 달라는 곳은 지원하지 마세요.</li>
        <li>대금은 되도록 플랫폼 결제(작업 완료 뒤 지급되는 방식)로 받으세요.</li>
      </ul>

      <H2>외화로 받기</H2>
      <ul>
        <li>해외 의뢰인에게 일해 주고 외화로 받는 것은 금지된 거래가 아니에요.</li>
        <li>PayPal, Payoneer, Wise나 은행 해외송금으로 받는 경우가 많아요. 은행이 받는 이유를 물으면 &lsquo;용역(서비스) 대가&rsquo;라고 하면 돼요.</li>
        <li>
          금액이 크거나 1년 동안 받은 돈이 많으면 거래 내역이 국세청 등에 통보될 수 있어요. 문제가 되는 일은 아니지만 소득 신고와
          맞아야 해요. 정확한 기준은 거래 은행에 확인하세요.
        </li>
      </ul>

      <H2>세금</H2>
      <ul>
        <li>
          한국에 사는 사람은 해외에서 번 돈도 매년 5월 종합소득세 신고 대상이에요. 해외 플랫폼은 국내처럼 3.3%를 떼지 않으니 직접
          신고해야 해요. 신고하지 않으면 가산세가 붙어요.
        </li>
        <li>입금·정산 내역과 계약 내용을 모아 두세요. 외화는 원화로 바꿔 신고해요.</li>
        <li>미국 플랫폼은 W-8BEN(미국 밖 거주자 확인서)을 요구해요. 외국에서 이미 뗀 세금은 신고할 때 공제받을 수 있어요.</li>
        <li>꾸준히 하면 사업자등록이 필요할 수 있고, 일의 종류에 따라 부가가치세 면세 여부가 달라요. 국세청(126)이나 세무사에게 확인하세요.</li>
      </ul>

      <H2>건강보험</H2>
      <p>
        가족의 피부양자로 올라 있다면 주의하세요. 사업자등록이 없을 때는 이 소득(경비를 뺀 금액)이 1년에 500만 원을 넘으면, 사업자등록을
        했다면 소득이 생기는 즉시 피부양자에서 빠질 수 있어요. 국민건강보험공단(1577-1000)에 확인하세요.
      </p>

      <H2>회사원·공무원</H2>
      <p>회사원은 회사 규정의 겸업 금지 조항을, 공무원은 소속 기관의 겸직 허가를 먼저 확인하세요.</p>

      <H2>{b}이 거르는 일감</H2>
      <ul>
        <li>한국 거주자가 지원할 수 없는 일, 기간 없는 정규직, AI 사용을 금지한 일, 성인 콘텐츠</li>
        <li>시급이 한국 최저임금({minWageKrw("2026-11-14").toLocaleString("ko-KR")}원, 2026년)보다 낮게 적힌 일</li>
      </ul>
      <p className="text-sm text-muted">
        공고 문구를 보고 자동으로 거르기 때문에 모두 걸러진다고 보장하지는 못해요. 이상한 일감은 메일의 [관심 없어요·신고]로 알려
        주세요. 문의처는{" "}
        <Link href="/privacy" className="font-semibold underline underline-offset-2">
          개인정보 처리방침
        </Link>
        에 있어요.
      </p>
    </article>
  );
}
