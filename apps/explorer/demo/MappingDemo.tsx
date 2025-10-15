import React from 'react';
import { LiveCode } from '../src/components/organisms/live-code';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import type { Mapping } from '@walkeros/core';

export function MappingDemo() {
  return (
    <div style={{ padding: '20px', minHeight: '100vh' }}>
      <h1>Mapping Demo</h1>
      <LiveCode
        input={`{
  "id": "P123",
  "productName": "Laptop",
  "price": 999
}`}
        config={`{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "item_id": "data.id",
          "item_name": "data.productName",
          "price": "data.price",
          "currency": { "value": "USD" }
        }
      }
    }
  }
}`}
        fn={async (inputStr, configStr, log) => {
          const data = JSON.parse(inputStr as string);
          const mapping = JSON.parse(configStr as string) as Mapping.Rules;

          const event = createEvent({ name: 'product view', data });
          const mappingResult = await getMappingEvent(event, mapping);
          const result = await getMappingValue(
            event,
            mappingResult.eventMapping?.data,
            {
              collector: { id: 'demo' } as any,
            },
          );

          log(result);
        }}
        labelInput="Event Data"
        labelConfig="Mapping Config"
        labelOutput="Result"
      />
    </div>
  );
}
