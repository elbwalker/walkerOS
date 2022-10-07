import { Measurement } from './measurement.d';

const Entities = {
  Account: 'account',
  Page: 'page',
  Pricing: 'pricing',
  Promotion: 'promotion',
};

const Actions = {
  Learn: 'learn',
  Start: 'start',
  View: 'view',
  Visible: 'visible',
};

const Properties = {
  Title: 'title',
};

const Owners = {
  Alexander: { name: 'Alexander' },
  Ayla: { name: 'Ayla' },
};

const Plan: Measurement.Plan = {
  version: 1,
  name: 'elbwalker.com',
  owners: [Owners.Alexander, Owners.Ayla],
  entities: {
    [Entities.Promotion]: {
      name: 'Promotion Banner (CTA)',
      actions: {
        [Actions.Visible]: {
          name: 'Promotion visible',
          properties: [Properties.Title],
          trigger: Measurement.Trigger.Visible,
          type: Measurement.ActionType.Basic,
        },
        [Actions.Start]: {
          name: 'Promotion start click',
          properties: [Properties.Title],
          trigger: Measurement.Trigger.Click,
          type: Measurement.ActionType.Basic,
        },
        [Actions.Learn]: {
          name: 'Promotion learn click',
          properties: [Properties.Title],
          trigger: Measurement.Trigger.Click,
          type: Measurement.ActionType.Basic,
        },
      },
      properties: {
        [Properties.Title]: {
          name: 'Title',
          type: Measurement.PropertyType.Text,
        },
      },
      owners: [Owners.Ayla],
    },
  },
  globals: {},
  destinations: {
    console: {
      name: 'Debug console',
      type: 'custom',
      owners: [Owners.Alexander],
      config: {},
    },
    gtm: {
      name: 'Google Tag Manager',
      type: 'custom',
      owners: [Owners.Alexander],
      config: {
        // consent: {},
        mapping: {
          [Entities.Promotion]: {
            '*': {
              custom: {},
            },
          },
        },
      },
    },
  },
};

const Data = { Plan, Entities, Actions };

export default Data;
