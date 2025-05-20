import React, { memo } from "react";

import useI18n from "@/i18n/hook";
import DeterminateTooltip from "@components/DeterminateTooltip";
import "./index.less";
type IProps = {
  enabled?: boolean;
  reSend: () => void;
};
const ns = "mc-message-failStatusContainer";
const FailStatusContainer: React.FC<React.PropsWithChildren<IProps>> = (
  props
) => {
  const { reSend } = props;
  const { t } = useI18n();
  const r: IProps['reSend'] = () => {}

  if (!props.enabled) {
    return props.children;
  }

  return (
    <div className={ns}>
      <div className={`${ns}-iconContainer`}>
        <DeterminateTooltip data={t("resend")}>
          <div className={`iconfont ${ns}-icon`} onClick={reSend}>
            &#xe6e3;
          </div>
        </DeterminateTooltip>
      </div>
      <div className={`${ns}-content`}>{props.children}</div>
    </div>
  );
};
export default FailStatusContainer;
