import { useCallback, useRef, useState } from 'react';

export const useLongPress = (
    onLongPress: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void,
    onClick: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void,
    { shouldPreventDefault = true, delay = 2000 } = {}
) => {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<any>(null);
    const target = useRef<any>(null);

    const start = useCallback(
        (event: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
            if (shouldPreventDefault && event.target) {
                event.target.addEventListener('touchend', preventDefault, {
                    passive: false
                });
                target.current = event.target;
            }
            setLongPressTriggered(false);
            timeout.current = setTimeout(() => {
                onLongPress(event);
                setLongPressTriggered(true);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (event: React.PointerEvent | React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
            timeout.current && clearTimeout(timeout.current);
            if (shouldTriggerClick && !longPressTriggered) {
                onClick(event);
            }
            setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener('touchend', preventDefault);
            }
        },
        [shouldPreventDefault, onClick, longPressTriggered]
    );

    return {
        onPointerDown: (e: React.PointerEvent) => {
            e.stopPropagation();
            start(e);
        },
        onPointerUp: (e: React.PointerEvent) => {
            e.stopPropagation();
            clear(e);
        },
        onPointerLeave: (e: React.PointerEvent) => {
            e.stopPropagation();
            clear(e, false);
        }
    };
};

const preventDefault = (event: Event) => {
    if ('touches' in event && (event as any).touches.length < 2 && event.preventDefault) {
        event.preventDefault();
    }
};
