# Tagger

Made to be used with
[@elbwalker/walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/utils/tagger/).

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

tagger.action('visible', 'impression'); // { "data-elbaction": "visible:impression" }
tagger.action({ click: 'add', load: 'view' }); // { "data-elbaction": "click:add;load:view" }

tagger.property('promo', 'text', 'hey'); // { "data-elb-promo": "text:hey" }
tagger.property('promo', { id: '1', text: 'hey' }); // { "data-elb-e": "id:1;text:hey" }

tagger.context('test', 'a'); // { "data-elbcontext": "test:a" }
tagger.context({ test: 'a', pos: 'hero' }); // { "data-elbcontext": "test:a;pos:hero" }

tagger.globals('language', 'en'); // { "data-elbglobals": "language:en" }
tagger.globals({ language: 'de', pagegroup: 'shop' }); // { "data-elbglobals": "language:de;pagegroup:shop" }
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions) or getting in
[contact](https://calendly.com/elb-alexander/30min).
