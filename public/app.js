import { init } from '@tma.js/sdk';
import TonConnect from '@tonconnect/ui';

const { cloudStorage } = await init();
const tc = new TonConnect({ manifestUrl: 'https://fastapmining.vercel.app/tonconnect-manifest.json' });

// Tap logic
document.getElementById('tapArea').onclick = async () => {
  const shares = await cloudStorage.getItem('shares') || 0;
  await cloudStorage.setItem('shares', String(Number(shares) + 1));
};
