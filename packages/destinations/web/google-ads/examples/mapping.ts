import type { Mapping } from '@elbwalker/types';
import type { DestinationGoogleAds } from '../src';

export const conversion: DestinationGoogleAds.EventConfig = {
  name: 'label',
  data: {
    map: {
      transaction_id: 'data.id',
      value: 'data.total',
      currency: { key: 'data.currency', value: 'EUR' },
    },
  },
};

export const config = {
  order: { complete: conversion },
} satisfies Mapping.Config;
