import { PageHeader } from '@/components/PageHeader';
import { TodoBoardClient } from '@/components/TodoBoardClient';
import { readDashboardData } from '@/lib/data';

export default function TodoPage() {
  const data = readDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader description="Окрема todo-дошка для продажів: quick add, теги, приоритети, фільтри і автоматичні задачі з аналітики." kicker="Action workspace" title="Todo" />
      <TodoBoardClient data={data} />
    </div>
  );
}
