import { Pill } from "@/components/ui/badge";
import { STAGE_LABEL, STATUS_LABEL } from "@/lib/crm/stage";
const tone = (s) => (s === "COMPLETED" ? "wa" : s === "ABANDONED" || s === "HUMAN" ? "warn" : "mute");
export const StagePill = ({ stage }) => <Pill tone={tone(stage)}>{STAGE_LABEL[stage]}</Pill>;
export const StatusPill = ({ status }) => <Pill tone={status === "HANDOFF" ? "warn" : status === "STAFF_ACTIVE" ? "wa" : "mute"}>{STATUS_LABEL[status]}</Pill>;
