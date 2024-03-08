/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, {
  Component,
  ContextType,
  createRef,
  FunctionComponent,
  JSXElementConstructor,
  KeyboardEvent,
  memo,
  MutableRefObject,
  ReactNode,
  useMemo,
  useState,
  useCallback,
  useContext,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';

import { IS_JEST_ENVIRONMENT } from '../../../../utils';
import { keys } from '../../../../services';
import { EuiScreenReaderOnly } from '../../../accessibility';
import { EuiI18n } from '../../../i18n';
import { EuiTextBlockTruncate } from '../../../text_truncate';
import { hasResizeObserver } from '../../../observer/resize_observer/resize_observer';

import { DataGridFocusContext } from '../../utils/focus';
import { RowHeightVirtualizationUtils } from '../../utils/row_heights';
import {
  EuiDataGridCellProps,
  EuiDataGridCellState,
  EuiDataGridSetCellProps,
  EuiDataGridCellValueElementProps,
  EuiDataGridCellValueProps,
  EuiDataGridCellPopoverElementProps,
  EuiDataGridRowHeightOption,
  EuiDataGridColumn,
} from '../../data_grid_types';
import {
  EuiDataGridCellActions,
  EuiDataGridCellPopoverActions,
} from './data_grid_cell_actions';
import { DefaultCellPopover } from './data_grid_cell_popover';
import { HandleInteractiveChildren } from './focus_utils';

const EuiDataGridCellContent: FunctionComponent<
  EuiDataGridCellValueProps & {
    setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
    setCellContentsRef: (ref: HTMLDivElement | null) => void;
    isExpanded: boolean;
    isControlColumn: boolean;
    isFocused: boolean;
    ariaRowIndex: number;
    rowHeight?: EuiDataGridRowHeightOption;
    cellActions?: ReactNode;
  }
> = memo(
  ({
    renderCellValue,
    cellContext,
    column,
    setCellContentsRef,
    rowIndex,
    colIndex,
    ariaRowIndex,
    rowHeight,
    rowHeightUtils,
    isControlColumn,
    isFocused,
    cellActions,
    ...rest
  }) => {
    // React is more permissive than the TS types indicate
    const CellElement =
      renderCellValue as JSXElementConstructor<EuiDataGridCellValueElementProps>;

    const cellHeightType = useMemo(
      () => rowHeightUtils?.getHeightType(rowHeight) || 'default',
      [rowHeightUtils, rowHeight]
    );

    const classes = useMemo(
      () =>
        classNames(
          'euiDataGridRowCell__content',
          `euiDataGridRowCell__content--${cellHeightType}Height`,
          !isControlColumn && {
            'eui-textBreakWord': cellHeightType !== 'default',
            'eui-textTruncate': cellHeightType === 'default',
          }
        ),
      [cellHeightType, isControlColumn]
    );

    const cellContent = useMemo(
      () => (
        <div
          ref={setCellContentsRef}
          data-datagrid-cellcontent
          className={classes}
        >
          <CellElement
            isDetails={false}
            data-test-subj="cell-content"
            rowIndex={rowIndex}
            colIndex={colIndex}
            schema={column?.schema || rest.columnType}
            {...cellContext}
            {...rest}
          />
        </div>
      ),
      [
        setCellContentsRef,
        classes,
        CellElement,
        rowIndex,
        colIndex,
        column?.schema,
        cellContext,
        rest,
      ]
    );

    const screenReaderText = useMemo(
      () => (
        <EuiScreenReaderOnly>
          <p hidden={!isFocused}>
            {'- '}
            <EuiI18n
              token="euiDataGridCell.position"
              default="{columnId}, column {col}, row {row}"
              values={{
                columnId: column?.displayAsText || rest.columnId,
                col: colIndex + 1,
                row: ariaRowIndex,
              }}
            />
            {cellActions && (
              <>
                {'. '}
                <EuiI18n
                  token="euiDataGridCell.expansionEnterPrompt"
                  default="Press the Enter key to expand this cell."
                />
              </>
            )}
          </p>
        </EuiScreenReaderOnly>
      ),
      [
        isFocused,
        column?.displayAsText,
        rest.columnId,
        colIndex,
        ariaRowIndex,
        cellActions,
      ]
    );

    const truncatedCellContent = useMemo(() => {
      if (cellHeightType === 'lineCount' && !isControlColumn) {
        const lines = rowHeightUtils!.getLineCount(rowHeight)!;
        return (
          <EuiTextBlockTruncate lines={lines} cloneElement>
            {cellContent}
          </EuiTextBlockTruncate>
        );
      }
      return cellContent;
    }, [
      cellHeightType,
      isControlColumn,
      rowHeightUtils,
      rowHeight,
      cellContent,
    ]);

    return (
      <>
        {truncatedCellContent}
        {screenReaderText}
        {cellActions}
      </>
    );
  }
);

EuiDataGridCellContent.displayName = 'EuiDataGridCellContent';

export const Cell: React.FunctionComponent<{
  ariaRowIndex: number;
  isFocused: boolean;
  cellRef: React.MutableRefObject<HTMLDivElement | null>;
  cellProps: EuiDataGridSetCellProps;
  columnId: string;
  colIndex: number;
  rowIndex: number;
  visibleRowIndex: number;
  handleCellKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseEnter: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onMouseLeave: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  updateCellFocusContext: () => void;
  isExpandable: boolean;
  cellContentProps: EuiDataGridCellValueProps & {
    setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
    setCellContentsRef: (ref: HTMLDivElement | null) => void;
    isExpanded: boolean;
    isControlColumn: boolean;
    isFocused: boolean;
    ariaRowIndex: number;
  };
  showCellActions: boolean;
  column?: EuiDataGridColumn;
  handleCellExpansionClick: () => void;
  popoverAnchorRef: React.MutableRefObject<HTMLDivElement | null>;
}> = memo(
  ({
    ariaRowIndex,
    isFocused,
    cellRef,
    cellProps,
    columnId,
    colIndex,
    rowIndex,
    visibleRowIndex,
    handleCellKeyDown,
    onMouseEnter,
    onMouseLeave,
    updateCellFocusContext,
    isExpandable,
    cellContentProps,
    showCellActions,
    column,
    handleCellExpansionClick,
    popoverAnchorRef,
  }) => {
    const cellActions = useMemo(() => {
      if (showCellActions)
        return (
          <>
            <EuiDataGridCellActions
              rowIndex={rowIndex}
              colIndex={colIndex}
              column={column}
              onExpandClick={handleCellExpansionClick}
            />
            {/* Give the cell expansion popover a separate div/ref - otherwise the
        extra popover wrappers mess up the absolute positioning and cause
        animation stuttering */}
            <div ref={popoverAnchorRef} data-test-subject="cellPopoverAnchor" />
          </>
        );
    }, [
      showCellActions,
      colIndex,
      rowIndex,
      column,
      handleCellExpansionClick,
      popoverAnchorRef,
    ]);
    return (
      <div
        role="gridcell"
        aria-rowindex={ariaRowIndex}
        tabIndex={isFocused ? 0 : -1}
        ref={cellRef}
        {...cellProps}
        data-test-subj="dataGridRowCell"
        // Data attributes to help target specific cells by either data or current cell location
        data-gridcell-column-id={columnId} // Static column ID name, not affected by column order
        data-gridcell-column-index={colIndex} // Affected by column reordering
        data-gridcell-row-index={rowIndex} // Index from data, not affected by sorting or pagination
        data-gridcell-visible-row-index={visibleRowIndex} // Affected by sorting & pagination
        onKeyDown={handleCellKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <HandleInteractiveChildren
          cellEl={cellRef.current}
          updateCellFocusContext={updateCellFocusContext}
          renderFocusTrap={!isExpandable}
        >
          <EuiDataGridCellContent
            {...cellContentProps}
            cellActions={cellActions}
          />
        </HandleInteractiveChildren>
      </div>
    );
  }
);
Cell.displayName = 'Cell';

export const EuiDataGridCell: React.FunctionComponent<EuiDataGridCellProps> =
  memo(
    ({
      width,
      popoverContext,
      interactiveCellId,
      columnType,
      className,
      column,
      style,
      rowHeightUtils,
      rowHeightsOptions,
      rowManager,
      pagination,
      rowIndex,
      visibleRowIndex,
      colIndex,
      columnId,
      renderCellPopover,
      renderCellValue,
      setRowHeight,
      ...rest
    }) => {
      const cellRef = useRef<HTMLDivElement | null>(null);
      const popoverAnchorRef = useRef<HTMLDivElement | null>(null);
      const cellContentsRef = useRef<HTMLDivElement | null>(null);
      const contentObserverRef = useRef<ResizeObserver | null>(null);
      const trackedProps = useMemo(() => {
        return {
          columnId,
          rowIndex,
          style,
          popoverContext,
          renderCellPopover,
          rowHeightsOptions,
        };
      }, [
        columnId,
        rowIndex,
        style,
        popoverContext,
        renderCellPopover,
        rowHeightsOptions,
      ]);
      const prevPropsRef = useRef(trackedProps);
      const [cellProps, setCellProps] = useState<EuiDataGridSetCellProps>({});
      const [isFocused, setIsFocused] = useState<boolean>(false);
      const [isHovered, setIsHovered] = useState(false);
      const [cellTextAlign, setCellTextAlign] = useState('Left');
      const {
        setFocusedCell,
        onFocusUpdate: onFocusUpdateContext,
        setIsFocusedCellInView,
        focusedCell,
      } = useContext(DataGridFocusContext);

      const updateCellFocusContext = useCallback(() => {
        setFocusedCell([colIndex, visibleRowIndex]);
      }, [setFocusedCell, colIndex, visibleRowIndex]);

      const {
        cellLocation,
        closeCellPopover,
        openCellPopover,
        popoverIsOpen,
        setCellPopoverProps,
        setPopoverAnchor,
        setPopoverAnchorPosition,
        setPopoverContent,
      } = popoverContext;

      const takeFocus = useCallback((preventScroll: boolean) => {
        const cell = cellRef.current;
        if (cell && !cell.contains(document.activeElement)) {
          cell.focus({ preventScroll });
        }
      }, []);
      const recalculateAutoHeight = useCallback(() => {
        if (
          cellContentsRef.current &&
          rowHeightUtils &&
          rowHeightUtils.isAutoHeight(rowIndex, rowHeightsOptions)
        ) {
          const rowHeight = cellContentsRef.current.offsetHeight;
          rowHeightUtils.setRowHeight(
            rowIndex,
            columnId,
            rowHeight,
            visibleRowIndex
          );
        }
      }, [
        rowHeightUtils,
        rowHeightsOptions,
        rowIndex,
        visibleRowIndex,
        columnId,
      ]);

      const recalculateLineHeight = useCallback(() => {
        if (!setRowHeight) return;
        if (!cellContentsRef.current) return;

        const rowHeightOption = rowHeightUtils?.getRowHeightOption(
          rowIndex,
          rowHeightsOptions
        );
        const isSingleLine = rowHeightOption == null;
        const lineCount = isSingleLine
          ? 1
          : rowHeightUtils?.getLineCount(rowHeightOption);

        if (lineCount) {
          const shouldUseHeightsCache = rowHeightUtils?.isRowHeightOverride(
            rowIndex,
            rowHeightsOptions
          );
          const height = rowHeightUtils?.calculateHeightForLineCount(
            cellContentsRef.current,
            lineCount,
            shouldUseHeightsCache
          );

          if (shouldUseHeightsCache) {
            rowHeightUtils?.setRowHeight(
              rowIndex,
              columnId,
              height,
              visibleRowIndex
            );
          } else if (height) {
            setRowHeight(height);
          }
        }
      }, [
        rowHeightUtils,
        rowHeightsOptions,
        rowIndex,
        visibleRowIndex,
        columnId,
        setRowHeight,
      ]);

      const isFocusedCell = useMemo(() => {
        return (
          focusedCell?.[0] === colIndex && focusedCell?.[1] === visibleRowIndex
        );
      }, [focusedCell, colIndex, visibleRowIndex]);

      const onFocusUpdate = useCallback(
        (isFocused: boolean, preventScroll = false) => {
          setIsFocused(isFocused);
          if (isFocused) {
            takeFocus(preventScroll);
          }
        },
        [takeFocus]
      );

      const isExpandable = useMemo(() => {
        if (column?.cellActions?.length) return true;
        return cellProps.isExpandable ?? rest.isExpandable;
      }, [column, cellProps.isExpandable, rest.isExpandable]);

      const isPopoverOpen = useMemo(() => {
        return (
          isExpandable &&
          popoverIsOpen &&
          cellLocation.colIndex === colIndex &&
          cellLocation.rowIndex === visibleRowIndex
        );
      }, [
        colIndex,
        visibleRowIndex,
        isExpandable,
        cellLocation.colIndex,
        cellLocation.rowIndex,
        popoverIsOpen,
      ]);

      const popoverContent = useMemo(() => {
        const PopoverElement = renderCellPopover || DefaultCellPopover;
        const CellElement = renderCellValue;
        const sharedProps = {
          rowIndex,
          colIndex,
          columnId,
          schema: column?.schema || columnType,
        };
        return (
          <PopoverElement
            {...sharedProps}
            cellContentsElement={cellContentsRef.current}
            cellActions={
              <EuiDataGridCellPopoverActions {...sharedProps} column={column} />
            }
            DefaultCellPopover={DefaultCellPopover}
            setCellPopoverProps={setCellPopoverProps}
          >
            <CellElement
              {...sharedProps}
              setCellProps={setCellProps}
              isExpandable={true}
              isExpanded={true}
              isDetails={true}
            />
          </PopoverElement>
        );
      }, [
        cellContentsRef,
        column,
        colIndex,
        columnType,
        rowIndex,
        columnId,
        renderCellPopover,
        renderCellValue,
        setCellPopoverProps,
      ]);

      const handleCellPopover = useCallback(() => {
        if (isPopoverOpen) {
          const cellAnchorEl = popoverAnchorRef.current;
          setPopoverAnchor(cellAnchorEl);
          setPopoverAnchorPosition(`down${cellTextAlign}`);
          setPopoverContent(popoverContent);
        }
      }, [
        cellTextAlign,
        isPopoverOpen,
        popoverContent,
        setPopoverAnchor,
        setPopoverAnchorPosition,
        setPopoverContent,
      ]);

      const handleCellKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
          if (isExpandable) {
            if (isPopoverOpen) return;
            const { openCellPopover } = popoverContext;

            switch (event.key) {
              case keys.ENTER:
              case keys.F2:
                event.preventDefault();
                openCellPopover({ rowIndex: visibleRowIndex, colIndex });
                break;
            }
          }
        },
        [isExpandable, isPopoverOpen, popoverContext, visibleRowIndex, colIndex]
      );

      const handleCellExpansionClick = useCallback(() => {
        if (isPopoverOpen) {
          closeCellPopover();
        } else {
          openCellPopover({ rowIndex: visibleRowIndex, colIndex });
        }
      }, [
        isPopoverOpen,
        visibleRowIndex,
        colIndex,
        closeCellPopover,
        openCellPopover,
      ]);

      const onMouseEnter = useCallback(() => {
        setIsHovered(true);
      }, []);

      const onMouseLeave = useCallback(() => {
        setIsHovered(false);
      }, []);

      const setCellContentsRef = useCallback(
        (ref: HTMLDivElement | null) => {
          cellContentsRef.current = ref;
          if (ref && hasResizeObserver) {
            const contentObserver = new window.ResizeObserver(() => {
              recalculateAutoHeight();
              recalculateLineHeight();
            });
            contentObserver.observe(ref);
            contentObserverRef.current = contentObserver;
          } else if (contentObserverRef.current) {
            contentObserverRef.current.disconnect();
            contentObserverRef.current = null;
          }
        },
        [recalculateAutoHeight, recalculateLineHeight]
      );

      const setCellTextAlignCallback = useCallback(() => {
        if (cellContentsRef.current) {
          if (!columnType) {
            setCellTextAlign('Left');
          } else if (columnType === 'numeric' || columnType === 'currency') {
            setCellTextAlign('Right');
          } else {
            const textAlign = window
              .getComputedStyle(cellContentsRef.current)
              .getPropertyValue('text-align');
            setCellTextAlign(
              textAlign === 'right' || textAlign === 'end' ? 'Right' : 'Left'
            );
          }
        }
      }, [columnType]);

      useEffect(() => {
        const unsubscribeCell = onFocusUpdateContext(
          [colIndex, visibleRowIndex],
          onFocusUpdateContext
        );

        if (isFocusedCell) {
          onFocusUpdate(true, true);
          setIsFocusedCellInView(true);
        }

        handleCellPopover();

        return () => {
          if (unsubscribeCell) {
            unsubscribeCell();
          }

          if (isFocusedCell) {
            setIsFocusedCellInView(false);
          }

          if (isPopoverOpen) {
            closeCellPopover();
          }
        };
      }, [
        colIndex,
        visibleRowIndex,
        onFocusUpdateContext,
        onFocusUpdate,
        isFocusedCell,
        handleCellPopover,
        isPopoverOpen,
        setIsFocusedCellInView,
        closeCellPopover,
      ]);

      useEffect(() => {
        recalculateAutoHeight();

        if (
          (rowHeightUtils as RowHeightVirtualizationUtils)
            ?.compensateForLayoutShift &&
          rowHeightsOptions?.scrollAnchorRow &&
          colIndex === 0 &&
          columnId === prevPropsRef.current.columnId &&
          rowIndex === prevPropsRef.current.rowIndex &&
          style?.top !== prevPropsRef.current.style?.top &&
          style?.top &&
          prevPropsRef.current.style?.top
        ) {
          // casting to a string from a number back to a number feels wrong ha
          const previousTop = parseFloat(
            String(prevPropsRef.current.style?.top)
          );
          const currentTop = parseFloat(String(style?.top));
          (
            rowHeightUtils as RowHeightVirtualizationUtils
          )?.compensateForLayoutShift(
            rowIndex,
            currentTop - previousTop,
            rowHeightsOptions?.scrollAnchorRow
          );
        }
      }, [
        rowHeightUtils,
        rowHeightsOptions,
        colIndex,
        rowIndex,
        columnId,
        renderCellPopover,
        style,
        popoverContext,
        handleCellPopover,
        recalculateAutoHeight,
        recalculateLineHeight,
      ]);

      useEffect(() => {
        if (
          rowHeightsOptions?.defaultHeight !==
          prevPropsRef.current.rowHeightsOptions?.defaultHeight
        ) {
          recalculateLineHeight();
        }
      }, [rowHeightsOptions, recalculateLineHeight]);

      useEffect(() => {
        if (
          popoverContext.popoverIsOpen !==
            prevPropsRef.current.popoverContext.popoverIsOpen ||
          popoverContext.cellLocation !==
            prevPropsRef.current.popoverContext.cellLocation ||
          renderCellPopover !== prevPropsRef.current.renderCellPopover
        ) {
          handleCellPopover();
        }
      }, [handleCellPopover, popoverContext, renderCellPopover]);

      useEffect(() => {
        if (
          columnId !== prevPropsRef.current.columnId ||
          rowIndex !== prevPropsRef.current.rowIndex
        ) {
          setCellProps({});
        }
      }, [columnId, rowIndex, setCellProps]);

      useEffect(() => {
        setCellTextAlignCallback();
      }, [setCellTextAlignCallback]);

      const showCellActions =
        isExpandable && (isPopoverOpen || isFocused || isHovered);

      const cellClasses = useMemo(() => {
        return classNames(
          'euiDataGridRowCell',
          `euiDataGridRowCell--align${cellTextAlign}`,
          {
            [`euiDataGridRowCell--${columnType}`]: columnType,
            'euiDataGridRowCell--open': isPopoverOpen,
          },
          className
        );
      }, [cellTextAlign, columnType, isPopoverOpen, className]);

      const ariaRowIndex = useMemo(() => {
        return pagination
          ? visibleRowIndex + 1 + pagination.pageSize * pagination.pageIndex
          : visibleRowIndex + 1;
      }, [pagination, visibleRowIndex]);

      const cellPropsWithoutExpandable = useMemo(() => {
        const {
          isExpandable: _,
          style: cellPropsStyle,
          className: cellPropsClassName,
          'data-test-subj': cellPropsDataTestSubj,
          ...setCellPropsRest
        } = cellProps;
        return setCellPropsRest;
      }, [cellProps]);

      const testSubj = useMemo(() => {
        return classNames('dataGridRowCell', cellProps['data-test-subj']);
      }, [cellProps]);

      const cellClassNames = useMemo(() => {
        return classNames(cellClasses, cellProps.className);
      }, [cellClasses, cellProps.className]);

      const cellStyles = useMemo(() => {
        return {
          ...style,
          top: style?.top ? 0 : undefined,
          width,
          lineHeight: rowHeightsOptions?.lineHeight ?? undefined,
          ...cellProps.style,
        };
      }, [style, width, rowHeightsOptions, cellProps.style]);

      const cellPropsWithStyle = useMemo(() => {
        return {
          ...cellPropsWithoutExpandable,
          'data-test-subj': testSubj,
          className: cellClassNames,
          style: cellStyles,
        };
      }, [cellPropsWithoutExpandable, testSubj, cellClassNames, cellStyles]);

      const rowHeight = useMemo(() => {
        return rowHeightUtils?.getRowHeightOption(rowIndex, rowHeightsOptions);
      }, [rowHeightUtils, rowIndex, rowHeightsOptions]);

      const cellContentProps = useMemo(() => {
        return {
          setCellProps,
          column,
          columnType,
          isExpandable,
          isExpanded: isPopoverOpen,
          isDetails: false,
          isFocused,
          setCellContentsRef,
          rowHeight,
          rowHeightUtils,
          isControlColumn: cellClasses.includes(
            'euiDataGridRowCell--controlColumn'
          ),
          ariaRowIndex,
          renderCellValue,
          rowIndex,
          visibleRowIndex,
          colIndex,
          columnId,
        };
      }, [
        column,
        columnType,
        isPopoverOpen,
        isFocused,
        rowHeight,
        rowHeightUtils,
        cellClasses,
        ariaRowIndex,
        setCellContentsRef,
        isExpandable,
        renderCellValue,
        rowIndex,
        visibleRowIndex,
        colIndex,
        columnId,
      ]);

      const cellContent = useMemo(() => {
        return (
          <Cell
            ariaRowIndex={ariaRowIndex}
            isFocused={isFocused}
            cellRef={cellRef}
            cellProps={cellPropsWithStyle}
            columnId={columnId}
            colIndex={colIndex}
            rowIndex={rowIndex}
            visibleRowIndex={visibleRowIndex}
            handleCellKeyDown={handleCellKeyDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            updateCellFocusContext={updateCellFocusContext}
            cellContentProps={cellContentProps}
            showCellActions={showCellActions}
            column={column}
            handleCellExpansionClick={handleCellExpansionClick}
            popoverAnchorRef={popoverAnchorRef}
            {...rest}
          />
        );
      }, [
        ariaRowIndex,
        isFocused,
        cellPropsWithStyle,
        columnId,
        colIndex,
        rowIndex,
        visibleRowIndex,
        handleCellKeyDown,
        onMouseEnter,
        onMouseLeave,
        updateCellFocusContext,
        cellContentProps,
        showCellActions,
        column,
        handleCellExpansionClick,
        rest,
      ]);
      prevPropsRef.current = trackedProps;

      return rowManager && !IS_JEST_ENVIRONMENT
        ? createPortal(
            cellContent,
            rowManager.getRow({
              rowIndex,
              visibleRowIndex,
              top: style!.top as string, // comes in as a `{float}px` string from react-window
              height: style!.height as number, // comes in as an integer from react-window
            })
          )
        : cellContent;
    }
  );

EuiDataGridCell.displayName = 'EuiDataGridCell';
