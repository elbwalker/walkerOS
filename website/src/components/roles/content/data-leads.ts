import type { RoleContent } from '../roles';

const content: RoleContent = {
  slug: 'data-leads',
  meta: {
    title: 'walkerOS for data leads: one event schema for every team',
    description:
      'Keep event definitions in a contract in your own repository. A validate step checks events against it, and git keeps the history when people leave.',
  },
  hero: {
    headline: 'The event schema that outlives whoever wrote it',
    lede: 'Your event definitions go into a contract in `flow.json`, the same file that configures the pipeline. A validate step you add to the pipeline checks events against it before they reach GA4 or another destination, and with the file in git, every change has an author and a date.',
    primary: {
      label: 'Read the contract guide',
      href: '/docs/getting-started/flow/contract',
    },
    secondary: {
      label: 'Talk to our team',
      href: 'https://www.elbwalker.com/services',
    },
  },
  situations: {
    headline: "The tracking you answer for but didn't build",
    items: [
      {
        claim:
          'A GTM container with ninety tags and sixty triggers, inherited from three agencies, that nobody dares change because nobody knows what would break.',
        witness:
          'Sources, destinations, mappings, consent rules and the contract sit in one `flow.json`, so a cleanup becomes a diff that can be reviewed before it ships. The [deploy guide](/docs/getting-started/deploy) recommends keeping that file in git so deploys stay reviewable and reversible.',
      },
      {
        claim:
          'The tracking plan is a spreadsheet from the last workshop, and nothing that runs on the site ever reads it.',
        witness:
          'The required fields for each event go into a [contract](/docs/getting-started/flow/contract) in `flow.json`. A [validate step](/docs/transformers/validate) in the pipeline checks the events that pass through it against that contract.',
      },
      {
        claim:
          'The agency that built your tracking is off the account, and nobody left in the company can explain how the container fits together.',
        witness:
          'When `flow.json` lives in a repository you own, an agency works through pull requests. Ending the engagement means removing their access, and the setup stays with you, running on [infrastructure you control](/docs/getting-started/deploy).',
      },
      {
        claim:
          'Consent Mode went in under a deadline, the CMP is wired to the container by hand, and nobody can say for sure what fires when a visitor clicks reject.',
        witness:
          'Each destination lists the consent it requires in its config, and its events wait in a queue until that consent is granted. Which tools receive data after a reject is written in the file. See [consent management](/docs/guides/consent).',
      },
    ],
  },
  changes: [
    {
      kicker: 'Contract',
      headline: 'Write the event definitions once and let teams add to them',
      body: 'A contract is a named block of JSON Schema at the top of `flow.json`, next to the flows that use it. It lists the fields each event must carry and the values they may take. A team with extra requirements, such as a logged-in area that also needs a user ID, extends the shared contract instead of copying it.',
      code: `"contract": {
  "default": {
    "tagging": 1,
    "schema": {
      "properties": {
        "globals": { "required": ["country"] }
      }
    }
  },
  "web": {
    "extend": "default",
    "events": {
      "product": {
        "add": { "properties": { "data": { "required": ["id", "quantity"] } } }
      }
    }
  },
  "web_loggedin": {
    "extend": "web",
    "schema": {
      "properties": {
        "user": {
          "required": ["id"],
          "properties": { "id": { "type": "string" } }
        }
      }
    }
  }
}`,
      caption:
        '`web` inherits the required `country` from `default`, and `web_loggedin` adds a required `user.id` on top of both.',
    },
    {
      kicker: 'Validation',
      headline: 'Check events against the contract inside the pipeline',
      body: 'The validate transformer is a step you place in the flow and point at a contract. In `pass` mode it marks each event as valid or invalid and lets it through. In `strict` mode an event that fails stops there and never reaches the next step. The list of errors is stored apart from the event, so it is still there after a strict drop.',
      code: `"validate": {
  "package": "@walkeros/transformer-validate",
  "config": { "settings": { "contract": ["$contract.web"], "mode": "strict" } },
  "next": "ga4"
}`,
      caption:
        'In `strict` mode, an event that fails `$contract.web` is dropped here and never reaches `ga4`.',
    },
    {
      kicker: 'Consent',
      headline: 'Each destination states the consent it needs',
      body: 'Consent is a field on every event, and each destination declares in its config which consent it requires. A destination receives events once one of its listed consents is granted, and until then they wait in a queue. When the consent state is updated, the queued events are processed in their original order. [CMP sources](/docs/sources/web/cmps) for CookieFirst, OneTrust and Usercentrics send that update for you.',
      code: `"destinations": {
  "api": {
    "package": "@walkeros/web-destination-api",
    "config": {
      "settings": { "url": "https://your-api.com/events" },
      "consent": { "functional": true }
    }
  },
  "ga4": {
    "package": "@walkeros/web-destination-gtag",
    "config": {
      "settings": { "ga4": { "measurementId": "G-XXXXXXXXXX" } },
      "consent": { "analytics": true }
    }
  }
}`,
      caption:
        'The API destination needs `functional` consent and GA4 needs `analytics`. Events for each wait in a queue until the visitor grants that consent.',
    },
  ],
  fit: {
    headline: 'It runs next to the setup you have today',
    stays: [
      'GA4 and the other tools you report from stay, each as a destination with its own [mapping](/docs/mapping).',
      'Your CMP still makes the consent decision. walkerOS picks up its state through a [CMP source](/docs/sources/web/cmps) or the `walker consent` command.',
      'Existing `dataLayer.push` calls keep working, and the [dataLayer source](/docs/sources/web/dataLayer) passes them into the pipeline as well.',
      'The definitions your teams already agreed on are the input for the first contract.',
    ],
    changes: [
      'Required fields and allowed values move from a shared document into a contract that a validate step checks.',
      'A cleanup or a handover shows up as a diff in git, and each change carries the name of the person who made it.',
      'An agency or contractor works in your repository, and removing their access leaves the setup in place.',
      'Consent requirements per destination are written in the config, so a change to them goes through review like any other change.',
    ],
    firstStep:
      'Pick one high-traffic event, write its contract, and have a developer add a validate step in `pass` mode. Review which events get marked invalid before anything is switched to `strict`.',
  },
  limits: [
    'walkerOS will not settle what "purchase" means across your teams. Someone has to agree on that before it goes into a contract.',
    'There is no approval screen for non-technical stakeholders. Changes to a contract are reviewed as pull requests.',
    'Validation only covers events that reach a validate step and match a rule in the contract, and an event with no matching rule passes. A component that stops sending an event altogether leaves nothing to check, so missing events need their own monitoring.',
    'walkerOS collects and routes events. It has no profile store, audience builder or reverse ETL, so anything you build on top of the data is still your own work.',
    'Consent handling still needs your own legal review. The walkerOS docs do not give legal advice.',
  ],
  questions: [
    {
      question:
        'GTM is free. What does running walkerOS cost us, servers included, and who looks after them?',
      answer:
        'In the browser neither costs anything: GTM is free, and walkerOS is open source under the MIT license. Server-side collection costs money with either tool, because a GTM server container also runs on infrastructure you pay for, and someone has to deploy and maintain it. The difference is what you pay for: GTM is a closed product you configure within its limits, while walkerOS is code your developers can extend and run where they choose. The [deploy guide](/docs/getting-started/deploy) covers Docker, Node and managed hosting, so you can price each path against what you run now.',
    },
    {
      question:
        'We already have a tracking plan and a review round before anything ships. What does a contract add?',
      answer:
        'In the setups we see, the plan has usually drifted from what the site sends, because nothing that runs reads it. A contract sits in `flow.json`, and a [validate step](/docs/transformers/validate) checks events against it as they pass through the pipeline, so a mismatch shows up when it happens. Your review round stays, and it gets a file a machine can check after approval. To watch one fail, follow [Break it on purpose](/docs/getting-started/flow/validate#break-it-on-purpose): give a step example an event without a required field and run `walkeros validate flow.json --strict`.',
    },
    {
      question:
        'Six months from now someone asks why a tracking setting changed, and the person who changed it has left. What can they find out?',
      answer:
        'If `flow.json` lives in your git repository, every committed change to a contract, a mapping or a consent rule has an author, a date and a message. Git cannot recover a reason nobody wrote down, so ask for one in the commit or the pull request. To see what that history looks like, run `git log -p flow.json` in the repository.',
    },
    {
      question:
        'Every vendor migration turns into re-tagging the whole site. Does that change?',
      answer:
        'Events are defined in your own [contract](/docs/getting-started/flow/contract), and each tool gets its own [mapping](/docs/mapping) from those events. Once the site sends walkerOS events, switching or adding a tool means configuring that destination and its mapping, and the tagging and the other destinations stay as they are. If your tracking still runs through GTM, the [dataLayer source](/docs/sources/web/dataLayer) can read the existing `dataLayer.push` calls, but replacing the vendor tags in the container with destinations is a one-time job. Check the [destinations list](/docs/destinations/) for the tool you expect to switch to next.',
    },
  ],
  next: {
    headline: 'Start with the contract, then decide how to roll it out',
    links: [
      {
        label: 'Read the contract guide',
        href: '/docs/getting-started/flow/contract',
        note: 'The contract format, inheritance with extend, and how a flow references it.',
      },
      {
        label: 'See how walkerOS compares',
        href: '/docs/comparisons/',
        note: 'Notes on GTM, Segment, Snowplow, RudderStack and other tools you may run today.',
      },
      {
        label: 'Get help from our team',
        href: 'https://www.elbwalker.com/services',
        note: 'Work with us on the first contract or the rollout across teams.',
      },
    ],
  },
};

export default content;
