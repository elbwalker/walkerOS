# Tagger

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the tagger with npm:

```sh
npm i --save @elbwalker/tagger
```

Import, instantiate and use the tagger

```ts
import Tagger from '@elbwalker/tagger';

const tagger = Tagger();
tagger.entity('promotion'); // { "data-elb": "promotion" }
tagger.action('visible', 'view'); // { "data-elbaction": "visible:view" }
tagger.property('promotion', 'category', 'analytics'); // { "data-elb-promotion": "category:analytics" }
tagger.context('test', 'engagement'); // { "data-elbcontext": "test:engagement" }
tagger.globals('language', 'en'); // { "data-elbglobals": "language:en" }
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
