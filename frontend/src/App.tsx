import BoardView from './features/board/BoardView.js';

const BOARD_ID = '00000000-0000-4000-a000-000000000001';
const COLUMNS = [
  { id: '00000000-0000-4000-a000-000000000010', name: 'To Do' },
  { id: '00000000-0000-4000-a000-000000000020', name: 'In Progress' },
  { id: '00000000-0000-4000-a000-000000000030', name: 'Done' },
];

export default function App() {
  return (
    <BoardView boardId={BOARD_ID} columns={COLUMNS} />
  );
}
