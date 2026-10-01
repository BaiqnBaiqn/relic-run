import {createRoot} from 'react-dom/client';
import RelicRun from './index.tsx';
import './guest.css';

// Guest play does not import or access a wallet provider.
createRoot(document.getElementById('root')!).render(
  <RelicRun friendId={0n} paused={false} guestMode walletUrl="./wallet/index.html"/>,
);
