import { SleepLogPanel } from '../components/sleep/SleepLogPanel';
import { PageIntro } from '../components/layout/PageIntro';

export function SleepPage() {
  return (
    <div>
      <PageIntro
        title="Sleep"
        description="Track sleep, naps, and awake time in one log"
      />
      <SleepLogPanel />
    </div>
  );
}
