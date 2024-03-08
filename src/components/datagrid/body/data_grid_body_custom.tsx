/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  FunctionComponent,
  useState,
  useMemo,
  useCallback,
  memo,
} from 'react';
import classNames from 'classnames';

import { useDefaultColumnWidth, useColumnWidths } from '../utils/col_widths';
import { useRowHeightUtils, useDefaultRowHeight } from '../utils/row_heights';

import {
  EuiDataGridBodyProps,
  EuiDataGridCustomBodyProps,
  EuiDataGridSetCustomGridBodyProps,
} from '../data_grid_types';
import { useDataGridHeader } from './header';
import { useDataGridFooter } from './footer';
import { CellWrapper } from './cell';

export const EuiDataGridBodyCustomRender: FunctionComponent<EuiDataGridBodyProps> =
  memo(
    ({
      renderCustomGridBody,
      leadingControlColumns,
      trailingControlColumns,
      columns,
      visibleColCount,
      schema,
      schemaDetectors,
      visibleRows,
      renderCellValue,
      cellContext,
      renderCellPopover,
      renderFooterCellValue,
      interactiveCellId,
      setVisibleColumns,
      switchColumnPos,
      onColumnResize,
      gridWidth,
      gridStyles,
      pagination,
      rowHeightsOptions,
    }) => {
      /**
       * Columns & widths
       */
      const visibleColumns = useMemo(() => {
        return [
          ...leadingControlColumns,
          ...columns,
          ...trailingControlColumns,
        ];
      }, [columns, leadingControlColumns, trailingControlColumns]);

      // compute the default column width from the container's width and count of visible columns
      const defaultColumnWidth = useDefaultColumnWidth(
        gridWidth,
        leadingControlColumns,
        trailingControlColumns,
        columns
      );

      const { columnWidths, setColumnWidth } = useColumnWidths({
        columns,
        leadingControlColumns,
        trailingControlColumns,
        defaultColumnWidth,
        onColumnResize,
      });

      /**
       * Row heights
       */
      const rowHeightUtils = useRowHeightUtils({
        rowHeightsOptions,
        gridStyles,
        columns,
      });

      const { setRowHeight, getRowHeight } = useDefaultRowHeight({
        rowHeightsOptions,
        rowHeightUtils,
      });

      /**
       * Header & footer
       */
      const { headerRow } = useDataGridHeader({
        switchColumnPos,
        setVisibleColumns,
        leadingControlColumns,
        trailingControlColumns,
        columns,
        columnWidths,
        defaultColumnWidth,
        setColumnWidth,
        schema,
        schemaDetectors,
      });
      const { footerRow } = useDataGridFooter({
        renderFooterCellValue,
        renderCellPopover,
        rowIndex: visibleRows.visibleRowCount,
        visibleRowIndex: visibleRows.visibleRowCount,
        interactiveCellId,
        leadingControlColumns,
        trailingControlColumns,
        columns,
        columnWidths,
        defaultColumnWidth,
        schema,
      });

      /**
       * Cell render fn
       */
      const cellProps = useMemo(() => {
        return {
          schema,
          schemaDetectors,
          pagination,
          columns,
          leadingControlColumns,
          trailingControlColumns,
          visibleColCount,
          columnWidths,
          defaultColumnWidth,
          renderCellValue,
          cellContext,
          renderCellPopover,
          interactiveCellId,
          setRowHeight,
          rowHeightsOptions,
          rowHeightUtils,
        };
      }, [
        schema,
        schemaDetectors,
        pagination,
        columns,
        leadingControlColumns,
        trailingControlColumns,
        visibleColCount,
        columnWidths,
        defaultColumnWidth,
        renderCellValue,
        cellContext,
        renderCellPopover,
        interactiveCellId,
        setRowHeight,
        rowHeightsOptions,
        rowHeightUtils,
      ]);
      const Cell: EuiDataGridCustomBodyProps['Cell'] = useCallback(
        ({ colIndex, visibleRowIndex, ...rest }) => {
          const props = {
            colIndex,
            visibleRowIndex,
            ...cellProps,
          };
          return (
            <CellWrapper
              {...props}
              {...rest}
              style={{
                height: rowHeightUtils.isAutoHeight(
                  visibleRowIndex,
                  rowHeightsOptions
                )
                  ? 'auto'
                  : getRowHeight(visibleRowIndex),
              }}
            />
          );
        },
        [cellProps, getRowHeight, rowHeightUtils, rowHeightsOptions]
      );

      // Allow consumers to pass custom props/attributes/listeners etc. to the wrapping div
      const [customGridBodyProps, setCustomGridBodyProps] =
        useState<EuiDataGridSetCustomGridBodyProps>({});

      return (
        <div
          {...customGridBodyProps}
          className={classNames(
            'euiDataGrid__customRenderBody',
            customGridBodyProps?.className
          )}
        >
          {headerRow}
          {renderCustomGridBody!({
            visibleColumns,
            visibleRowData: visibleRows,
            Cell,
            setCustomGridBodyProps,
          })}
          {footerRow}{' '}
        </div>
      );
    }
  );

EuiDataGridBodyCustomRender.displayName = 'EuiDataGridBodyCustomRender';
