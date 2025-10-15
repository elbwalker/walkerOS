import React from 'react';
import { LiveCode } from '../src/components/organisms/live-code';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import type { Mapping } from '@walkeros/core';

export function MappingDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Mapping Demo</h1>
      <LiveCode
        input={`{ id: 'P123', name: 'Laptop', price: 999 }`}
        config={`{
  product: {
    view: {
      name: 'view_item',
      data: {
        map: {
          item_id: 'data.id',
          item_name: 'data.name',
          price: 'data.price',
          currency: { value: 'USD' }
        }
      }
    }
  }
}`}
        fn={async (inputStr, configStr, log) => {
          const data = eval(`(${inputStr})`);
          const mapping = eval(`(${configStr})`) as Mapping.Rules;

          // Create full event
          const event = createEvent({ name: 'product view', data });

          // Get mapping
          const mappingResult = await getMappingEvent(event, mapping);

          // Transform data
          const result = await getMappingValue(
            event,
            mappingResult.eventMapping?.data,
            {
              collector: { id: 'demo' } as any,
            },
          );

          log({
            original: data,
            mapped: result,
            newName: mappingResult.eventMapping?.name,
          });
        }}
        labelInput="Event Data"
        labelConfig="Mapping Config"
        labelOutput="Result"
      />
    </div>
  );
}
