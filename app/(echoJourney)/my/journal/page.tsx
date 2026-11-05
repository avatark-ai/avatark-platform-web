import { guardExcludedSegment } from '@/lib/release/guards'
import { JournalPage } from "@/components/echo/journey/JournalView";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export default function Page() {
  guardExcludedSegment() // AVK-PROD-03A L2: excluded page code never runs in the institutional scope
  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col ${ECHO_READING_WIDTH_CLASS.narrow}`}>
        <JournalPage />
      </div>
    </EchoPageShell>
  );
}
