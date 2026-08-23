import type { TrackerView } from '@/types/queries';

// The four-stage step indicator from the original mobile app:
// Label created -> On the way -> Out for delivery -> Delivered
const STAGES: Array<{ key: keyof TrackerView; label: string }> = [
  { key: 'labelCreatedOnDate', label: 'Label created' },
  { key: 'onTheWayDate', label: 'On the way' },
  { key: 'outForDeliveryDate', label: 'Out for delivery' },
  { key: 'deliveredOnDate', label: 'Delivered' }
];

export function ShipmentJourney({ tracker }: { tracker: TrackerView }) {
  const position = tracker.journeyPosition;
  return (
    <div className="mt-3">
      <ol className="flex items-start">
        {STAGES.map((stage, index) => {
          const reached = index <= position;
          const current = index === position;
          const date = tracker[stage.key] as string | null;
          return (
            <li key={stage.key} className="flex-1 flex flex-col items-center text-center relative">
              {index > 0 && (
                <span
                  className={`absolute top-3 right-1/2 w-full h-0.5 ${index <= position ? 'bg-orange-500' : 'bg-gray-200'}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  reached
                    ? current
                      ? 'border-orange-500 bg-white text-orange-600'
                      : 'border-orange-500 bg-orange-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {reached && !current ? '✓' : index + 1}
              </span>
              <span className={`mt-1 text-xs ${reached ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{stage.label}</span>
              {date && <span className="text-[11px] text-gray-500">{date}</span>}
            </li>
          );
        })}
      </ol>
      {!tracker.isDelivered && (
        <div className="text-sm text-gray-600 mt-2 text-center">
          Estimated delivery:{' '}
          <span className="font-medium text-gray-800">{tracker.estimatedDeliveryDate ?? 'not known yet'}</span>
        </div>
      )}
    </div>
  );
}
