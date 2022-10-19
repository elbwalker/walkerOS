# Tagger

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the tagger with npm:

```sh
npm i --save @elbwalker/tagger
```

Import, configure and add the tagger

```ts
import { Tagger } from '@elbwalker/tagger';

const tagger = Tagger();
tagger.entity('product'); // { "data-elb": "product" }
tagger.action('click', 'add'); // { "data-elbaction": "click:add" }
tagger.property('product', 'name', 'tagger'); // { "data-elb.product": "name:Tagger" }
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
