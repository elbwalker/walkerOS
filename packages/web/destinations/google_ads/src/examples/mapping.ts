import type { Mapping } from '@walkerOS/types';
import type { DestinationAds } from '..';

export const conversion: DestinationAds.Rule = {
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
} satisfies Mapping.Rules;
