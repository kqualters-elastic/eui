/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '../../test/rtl';
import { EuiThemeBreakpoints, _EuiThemeBreakpoint } from '../variables';
import {
  useEuiBreakpoint,
  euiBreakpoint,
  useEuiMinBreakpoint,
  euiMinBreakpoint,
  useEuiMaxBreakpoint,
  euiMaxBreakpoint,
} from './_responsive';

describe('useEuiBreakpoint', () => {
  describe('common breakpoint size arrays', () => {
    const possibleTwoElementBreakpointCombinations = [];
    for (let i = 0; i < EuiThemeBreakpoints.length; i++) {
      for (let j = 1; j < EuiThemeBreakpoints.length; j++) {
        if (j > i) {
          possibleTwoElementBreakpointCombinations.push([
            `${EuiThemeBreakpoints[i]}`,
            `${EuiThemeBreakpoints[j]}`,
          ]);
        }
      }
    }

    test.each(possibleTwoElementBreakpointCombinations)(
      'returns a media query for two element breakpoint combinations (%s and %s)',
      (minSize, maxSize) => {
        expect(
          renderHook(() =>
            useEuiBreakpoint([
              minSize as _EuiThemeBreakpoint,
              maxSize as _EuiThemeBreakpoint,
            ])
          ).result.current
        ).toMatchSnapshot();
      }
    );
  });

  describe('single breakpoint sizes', () => {
    EuiThemeBreakpoints.forEach((size) => {
      test(`(${size})`, () => {
        expect(
          renderHook(() => useEuiBreakpoint([size])).result.current
        ).toMatchSnapshot();
      });
    });
  });

  describe('breakpoint size arrays with more than 2 sizes', () => {
    it('should use the first and last items in the array', () => {
      expect(
        renderHook(() => useEuiBreakpoint(['s', 'm', 'l'])).result.current
      ).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 575px) and (max-width: 1199px)"'
      );
    });

    it('handles sorting the array if sizes are passed in the wrong order', () => {
      expect(
        renderHook(() => useEuiBreakpoint(['l', 's', 'm'])).result.current
      ).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 575px) and (max-width: 1199px)"'
      );
    });
  });

  it('does not generate a min-width if the min size is xs', () => {
    expect(
      renderHook(() => useEuiBreakpoint(['xs', 'm'])).result.current
    ).toMatchInlineSnapshot('"@media only screen and (max-width: 991px)"');
  });

  it('skips generating a max-width if the max size is xl', () => {
    expect(
      renderHook(() => useEuiBreakpoint(['m', 'xl'])).result.current
    ).toMatchInlineSnapshot('"@media only screen and (min-width: 768px)"');
  });

  describe('fallback behavior', () => {
    const fallbackOutput = '@media only screen';

    test('if at least one input is not passed', () => {
      // @ts-expect-error Source has 0 element(s) but target requires 1
      expect(renderHook(() => useEuiBreakpoint([])).result.current).toEqual(
        fallbackOutput
      );
    });

    test('if a breakpoint key without a corresponding value is passed', () => {
      expect(
        renderHook(() => useEuiBreakpoint(['asdf'])).result.current
      ).toEqual(fallbackOutput);
    });
  });
});

describe('euiMinBreakpoint', () => {
  describe('generates a min-width only media query', () => {
    EuiThemeBreakpoints.slice(1).forEach((size) => {
      it(`(${size})`, () => {
        expect(
          renderHook(() => useEuiMinBreakpoint(size)).result.current
        ).toMatchSnapshot();
      });
    });
  });

  describe('fallback behavior', () => {
    const warnSpy = jest.spyOn(console, 'warn');
    beforeEach(() => warnSpy.mockReset());

    it('warns if using min-width on a breakpoint that equals 0px', () => {
      // This functionally does nothing, hence the warning
      expect(
        renderHook(() => useEuiMinBreakpoint('xs')).result.current
      ).toMatchInlineSnapshot('"@media only screen"');
      expect(warnSpy).toHaveBeenCalledWith('Invalid min breakpoint size: xs');
    });

    it('warns if an invalid size is passed', () => {
      expect(
        renderHook(() => useEuiMinBreakpoint('asdf')).result.current
      ).toMatchInlineSnapshot('"@media only screen"');
      expect(warnSpy).toHaveBeenCalledWith('Invalid min breakpoint size: asdf');
    });
  });
});

describe('euiMaxBreakpoint', () => {
  describe('generates a max-width only media query', () => {
    EuiThemeBreakpoints.slice(1).forEach((size) => {
      it(`(${size})`, () => {
        expect(
          renderHook(() => useEuiMaxBreakpoint(size)).result.current
        ).toMatchSnapshot();
      });
    });
  });

  describe('fallback behavior', () => {
    const warnSpy = jest.spyOn(console, 'warn');
    beforeEach(() => warnSpy.mockReset());

    it('warns if using max-width on a breakpoint that equals 0px', () => {
      // This functionally does nothing, hence the warning
      expect(
        renderHook(() => useEuiMaxBreakpoint('xs')).result.current
      ).toMatchInlineSnapshot('"@media only screen"');
      expect(warnSpy).toHaveBeenCalledWith('Invalid max breakpoint size: xs');
    });

    it('warns if an invalid size is passed', () => {
      expect(
        renderHook(() => useEuiMaxBreakpoint('asdf')).result.current
      ).toMatchInlineSnapshot('"@media only screen"');
      expect(warnSpy).toHaveBeenCalledWith('Invalid max breakpoint size: asdf');
    });
  });
});

describe('custom theme breakpoints', () => {
  const CUSTOM_BREAKPOINTS = {
    xxl: 700,
    xl: 600,
    l: 500,
    m: 400,
    s: 300,
    xs: 200,
    xxs: 100,
  };
  const mockEuiTheme: any = { euiTheme: { breakpoint: CUSTOM_BREAKPOINTS } };

  describe('euiBreakpoint', () => {
    it('correctly inherits the breakpoint size override', () => {
      expect(euiBreakpoint(mockEuiTheme, ['s', 'l'])).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 300px) and (max-width: 599px)"'
      );
    });

    it('correctly infers the largest breakpoint and does not render a max-width if passed', () => {
      expect(euiBreakpoint(mockEuiTheme, ['xl', 'xxl'])).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 600px)"'
      );
    });

    it('correctly uses the smallest breakpoint for a min-width if it is not set to 0', () => {
      expect(euiBreakpoint(mockEuiTheme, ['xxs', 'xs'])).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 100px) and (max-width: 299px)"'
      );
    });
  });

  describe('euiMinBreakpoint', () => {
    it('correctly inherits the custom breakpoint sizes', () => {
      expect(euiMinBreakpoint(mockEuiTheme, 'xxs')).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 100px)"'
      );
      expect(euiMinBreakpoint(mockEuiTheme, 'm')).toMatchInlineSnapshot(
        '"@media only screen and (min-width: 400px)"'
      );
    });
  });

  describe('euiMaxBreakpoint', () => {
    it('correctly inherits the custom breakpoint sizes', () => {
      expect(euiMaxBreakpoint(mockEuiTheme, 'l')).toMatchInlineSnapshot(
        '"@media only screen and (max-width: 499px)"'
      );
      expect(euiMaxBreakpoint(mockEuiTheme, 'xxl')).toMatchInlineSnapshot(
        '"@media only screen and (max-width: 699px)"'
      );
    });
  });
});
