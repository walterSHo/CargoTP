import { PageHeader } from '@/components/PageHeader';
import { TodoBoardClient } from '@/components/TodoBoardClient';
import { readDashboardData } from '@/lib/data';

export default function TodoPage() {
  const data = readDashboardData();
  return (
    <div className="space-y-6">
      <PageHeader
        description="Класичний і компактний todo-список для продажів: швидке додавання, теги, пріоритети, фільтри та автоматичні задачі з аналітики."
        kicker="Список дій"
        title="Задачі"
      />
      <TodoBoardClient data={data} />
    </div>
  );
}
