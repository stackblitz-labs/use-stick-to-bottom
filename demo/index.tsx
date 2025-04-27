import './index.css';
import { createRoot } from 'react-dom/client';
import { Demo } from './Demo.js'; // Import the Demo component

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<Demo />); // Render the Demo component
