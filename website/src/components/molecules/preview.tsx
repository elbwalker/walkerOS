import { FC, useRef, useState, useCallback, useEffect } from 'react';
import { debounce, tryCatch } from '@walkerOS/core';
import '@site/src/css/highlighting.scss';

interface PreviewProps {
  code: string;
  previewId?: string;
  boxClassNames?: string;
}

export const Preview: FC<PreviewProps> = ({
  code,
  previewId = 'preview',
  boxClassNames = 'flex-1 resize flex flex-col max-h-96 lg:max-h-full',
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState({
    globals: false,
    context: false,
    entity: false,
    property: false,
    action: false,
  });

  const toggleHighlight = (type: keyof typeof highlights) => {
    setHighlights((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const initPreview = useCallback(
    debounce(
      (elem: HTMLElement) => window.elb('walker init', elem),
      1000,
      true,
    ),
    [],
  );

  const updatePreviewContent = useCallback(
    debounce(
      (code: string) => {
        if (!previewRef.current) return;

        previewRef.current.innerHTML = code.trim().replace(/;$/, '');

        // Then find all entities and mark their properties
        const entities = Array.from(
          previewRef.current.querySelectorAll('[data-elb]'),
        )
          .map((el) => el.getAttribute('data-elb'))
          .filter((entity): entity is string => !!entity);

        entities.forEach((entity) => {
          tryCatch(() => {
            previewRef.current
              ?.querySelectorAll(`[data-elb-${entity}]`)
              .forEach((el) => {
                el.setAttribute('data-elbproperty', '');
              });
          })();
        });

        // Initialize walker
        initPreview(previewRef.current);
      },
      200,
      true,
    ),
    [],
  );

  // Subsequent updates
  useEffect(() => {
    updatePreviewContent(code);
  }, [code]);

  const highlightGlobals = highlights.globals ? 'highlight-globals' : '';
  const highlightContext = highlights.context ? 'highlight-context' : '';
  const highlightEntity = highlights.entity ? 'highlight-entity' : '';
  const highlightProperty = highlights.property ? 'highlight-property' : '';
  const highlightAction = highlights.action ? 'highlight-action' : '';

  return (
    <div
      className={`flex-1 flex flex-col border border-base-300 rounded-lg overflow-hidden bg-gray-800 ${boxClassNames}`}
    >
      <div className="font-bold px-2 py-1.5 bg-base-100 text-base flex justify-between items-center">
        <span>Preview</span>
      </div>
      <div
        data-elbcontext={`previewId:${previewId}`}
        className="flex-1 bg-gray-800 overflow-auto elb-highlight"
      >
        <div
          className={`p-6 h-full ${highlightGlobals} ${highlightContext} ${highlightEntity} ${highlightProperty} ${highlightAction}`}
        >
          <div ref={previewRef} className="h-full" />
        </div>
      </div>
      <div className="elb-highlight-buttons">
        <button
          onClick={() => toggleHighlight('context')}
          className={`btn-context ${highlightContext}`}
        >
          Context
        </button>
        <button
          onClick={() => toggleHighlight('entity')}
          className={`btn-entity ${highlightEntity}`}
        >
          Entity
        </button>
        <button
          onClick={() => toggleHighlight('property')}
          className={`btn-property ${highlightProperty}`}
        >
          Property
        </button>
        <button
          onClick={() => toggleHighlight('action')}
          className={`btn-action ${highlightAction}`}
        >
          Action
        </button>
      </div>
    </div>
  );
};

export default Preview;
