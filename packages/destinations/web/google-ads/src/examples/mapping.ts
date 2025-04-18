import type { Mapping } from '@elbwalker/types';
import type { DestinationGoogleAds } from '..';

export const conversion: DestinationGoogleAds.EventConfig = {
  name: 'labelId',
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
