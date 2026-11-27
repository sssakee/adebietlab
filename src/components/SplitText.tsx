import { Fragment } from "react";

/** Each word rises in after the previous one (CSS `.word`). The text itself is unchanged for screen readers. */
export function SplitText({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((w, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="word" style={{ "--i": from + i } as React.CSSProperties}>
        {w}
      </span>
    </Fragment>
  ));
}
