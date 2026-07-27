import { MyJourneyPage } from "@/components/echo/journey/MyJourneyView";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export default function Page() {
  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col ${ECHO_READING_WIDTH_CLASS.narrow}`}>
        <MyJourneyPage />
      </div>
    </EchoPageShell>
  );
}
