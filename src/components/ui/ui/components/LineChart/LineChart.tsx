"use client";
/*
 * Documentation:
 * Line Chart — https://app.subframe.com/fdd7b8a1b1a9/library?component=Line+Chart_22944dd2-3cdd-42fd-913a-1b11a3c1d16d
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../../utils";

export interface LineChartRootProps
  extends React.ComponentProps<typeof SubframeCore.LineChart> {
  className?: string;
}

const LineChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.LineChart>,
  LineChartRootProps
>(function LineChartRoot(
  { className, ...otherProps }: LineChartRootProps,
  ref
) {
  return (
    <SubframeCore.LineChart
      className={SubframeUtils.twClassNames("h-80 w-full", className)}
      ref={ref}
      colors={[
        "#dc4f6c",
        "#f8d0d8",
        "#c73157",
        "#f2a8b8",
        "#a1213f",
        "#e97590",
      ]}
      {...otherProps}
    />
  );
});

export const LineChart = LineChartRoot;
