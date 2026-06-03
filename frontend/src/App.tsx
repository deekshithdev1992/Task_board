import BoardView from './features/board/BoardView.js';

const BOARD_ID = 'demo-board-001';
const COLUMNS = [
  { id: 'col-todo', name: 'To Do' },
  { id: 'col-progress', name: 'In Progress' },
  { id: 'col-done', name: 'Done' },
];

export default function App() {
  return (
    <BoardView boardId={BOARD_ID} columns={COLUMNS} />
  );
}
