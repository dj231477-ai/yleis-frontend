"use client";
/*
 * Documentation:
 * Bar Chart — https://app.subframe.com/fdd7b8a1b1a9/library?component=Bar+Chart_4d4f30e7-1869-4980-8b96-617df3b37912
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../../utils";

export interface BarChartRootProps
  extends React.ComponentProps<typeof SubframeCore.BarChart> {
  stacked?: boolean;
  className?: string;
}

const BarChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.BarChart>,
  BarChartRootProps
>(function BarChartRoot(
  { stacked = false, className, ...otherProps }: BarChartRootProps,
  ref
) {
  return (
    <SubframeCore.BarChart
      className={SubframeUtils.twClassNames("h-80 w-full", className)}
      ref={ref}
      stacked={stacked}
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

export const BarChart = BarChartRoot;
