import '../index.css';
import { bootDemo, pageRoot } from './boot';
import { ShopSitePage } from './pages';

bootDemo(ShopSitePage, pageRoot(document));
