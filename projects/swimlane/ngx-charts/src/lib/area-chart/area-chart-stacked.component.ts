import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  HostListener,
  ChangeDetectionStrategy,
  ContentChild,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import { curveLinear } from 'd3-shape';

import { calculateViewDimensions } from '../common/view-dimensions.helper';
import { ColorHelper } from '../common/color.helper';
import { BaseChartComponent } from '../common/base-chart.component';
import { id } from '../utils/id';
import { getUniqueXDomainValues, getScaleType } from '../common/domain.helper';
import { SeriesType } from '../common/circle-series.component';
import { LegendOptions, LegendPosition } from '../common/types/legend.model';
import { ViewDimensions } from '../common/types/view-dimension.interface';
import { ScaleType } from '../common/types/scale-type.enum';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import { TooltipArea } from '../common/tooltip-area.component';

@Component({
  selector: 'ngx-charts-area-chart-stacked',
  template: `
    <ngx-charts-chart
      [view]="[width, height]"
      [showLegend]="legend"
      [legendOptions]="legendOptions"
      [activeEntries]="activeEntries"
      [animations]="animations"
      (legendLabelClick)="onClick($event)"
      (legendLabelActivate)="onActivate($event)"
      (legendLabelDeactivate)="onDeactivate($event)"
    >
      <svg:defs>
        <svg:clipPath [attr.id]="clipPathId">
          <svg:rect
            [attr.width]="dims.width + 10"
            [attr.height]="dims.height + 10"
            [attr.transform]="'translate(-5, -5)'"
          />
        </svg:clipPath>
      </svg:defs>
      <svg:g [attr.transform]="transform" class="area-chart chart">
        <svg:g
          ngx-charts-x-axis
          *ngIf="xAxis"
          [xScale]="xScale"
          [dims]="dims"
          [showGridLines]="showGridLines"
          [showLabel]="showXAxisLabel"
          [labelText]="xAxisLabel"
          [trimTicks]="trimXAxisTicks"
          [rotateTicks]="rotateXAxisTicks"
          [maxTickLength]="maxXAxisTickLength"
          [tickFormatting]="xAxisTickFormatting"
          [ticks]="xAxisTicks"
          [wrapTicks]="wrapTicks"
          (dimensionsChanged)="updateXAxisHeight($event)"
        ></svg:g>
        <svg:g
          ngx-charts-y-axis
          *ngIf="yAxis"
          [yScale]="yScale"
          [dims]="dims"
          [showGridLines]="showGridLines"
          [showLabel]="showYAxisLabel"
          [labelText]="yAxisLabel"
          [trimTicks]="trimYAxisTicks"
          [maxTickLength]="maxYAxisTickLength"
          [tickFormatting]="yAxisTickFormatting"
          [ticks]="yAxisTicks"
          [wrapTicks]="wrapTicks"
          (dimensionsChanged)="updateYAxisWidth($event)"
        ></svg:g>
        <svg:g [attr.clip-path]="clipPath">
          <svg:g *ngFor="let series of results; trackBy: trackBy">
            <svg:g
              ngx-charts-area-series
              [xScale]="xScale"
              [yScale]="yScale"
              [colors]="colors"
              [data]="series"
              [scaleType]="scaleType"
              [gradient]="gradient"
              [activeEntries]="activeEntries"
              [stacked]="true"
              [curve]="curve"
              [animations]="animations"
            />
          </svg:g>
        </svg:g>
      </svg:g>
      <svg:g class="timeline" [attr.transform]="transform">
        <svg:filter *ngIf="panning == 'onChart'" [attr.id]="filterId">
          <svg:feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"
          />
        </svg:filter>
        <svg:g 
          *ngIf="panning == 'onChart'" 
          class="brush"
          (mousemove)="mouseMove($event)"
          (mouseleave)="mouseLeave()"
        ></svg:g>
      </svg:g>
      <svg:g
        ngx-charts-timeline
        *ngIf="panning == 'timeline' && scaleType != 'ordinal'"
        [attr.transform]="timelineTransform"
        [results]="results"
        [view]="[timelineWidth, height]"
        [height]="timelineHeight"
        [scheme]="scheme"
        [customColors]="customColors"
        [legend]="legend"
        [scaleType]="scaleType"
        (onDomainChange)="updateDomain($event)"
      >
        <svg:g *ngFor="let series of results; trackBy: trackBy">
          <svg:g
            ngx-charts-area-series
            [xScale]="timelineXScale"
            [yScale]="timelineYScale"
            [colors]="colors"
            [data]="series"
            [scaleType]="scaleType"
            [gradient]="gradient"
            [stacked]="true"
            [curve]="curve"
            [animations]="animations"
          />
        </svg:g>
      </svg:g>
      <svg:g [attr.transform]="transform" class="area-chart chart">
        <svg:g [attr.clip-path]="clipPath">
          <svg:g *ngIf="!tooltipDisabled" (mouseleave)="hideCircles()">
            <svg:g
              ngx-charts-tooltip-area
              [dims]="dims"
              [xSet]="xSet"
              [xScale]="xScale"
              [yScale]="yScale"
              [results]="results"
              [colors]="colors"
              [tooltipDisabled]="tooltipDisabled"
              [tooltipTemplate]="seriesTooltipTemplate"
              [panning]="panning"
              (hover)="updateHoveredVertical($event)"
            />

            <svg:g *ngFor="let series of results; trackBy: trackBy">
              <svg:g
                ngx-charts-circle-series
                [type]="seriesType.Stacked"
                [xScale]="xScale"
                [yScale]="yScale"
                [colors]="colors"
                [activeEntries]="activeEntries"
                [data]="series"
                [scaleType]="scaleType"
                [visibleValue]="hoveredVertical"
                [tooltipDisabled]="tooltipDisabled"
                [tooltipTemplate]="tooltipTemplate"
                [brushEnd]="brushEnd"
                (select)="onClick($event, series)"
                (activate)="onActivate($event)"
                (deactivate)="onDeactivate($event)"
              />
            </svg:g>
          </svg:g>
        </svg:g>
      </svg:g>
    </ngx-charts-chart>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../common/base-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AreaChartStackedComponent extends BaseChartComponent {
  @Input() legend: boolean = false;
  @Input() legendTitle: string = 'Legend';
  @Input() legendPosition: LegendPosition = LegendPosition.Right;
  @Input() xAxis: boolean = false;
  @Input() yAxis: boolean = false;
  @Input() showXAxisLabel: boolean;
  @Input() showYAxisLabel: boolean;
  @Input() xAxisLabel: string;
  @Input() yAxisLabel: string;
  @Input() panning: string = "none";
  @Input() gradient: boolean;
  @Input() showGridLines: boolean = true;
  @Input() curve: any = curveLinear;
  @Input() activeEntries: any[] = [];
  @Input() schemeType: ScaleType;
  @Input() trimXAxisTicks: boolean = true;
  @Input() trimYAxisTicks: boolean = true;
  @Input() rotateXAxisTicks: boolean = true;
  @Input() maxXAxisTickLength: number = 16;
  @Input() maxYAxisTickLength: number = 16;
  @Input() xAxisTickFormatting: any;
  @Input() yAxisTickFormatting: any;
  @Input() xAxisTicks: any[];
  @Input() yAxisTicks: any[];
  @Input() roundDomains: boolean = false;
  @Input() tooltipDisabled: boolean = false;
  @Input() xScaleMin: any;
  @Input() xScaleMax: any;
  @Input() yScaleMin: number;
  @Input() yScaleMax: number;
  @Input() wrapTicks = false;

  @Output() onFilter = new EventEmitter();
  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ViewChild(TooltipArea) tooltipArea:TooltipArea;
  @ContentChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;
  @ContentChild('seriesTooltipTemplate') seriesTooltipTemplate: TemplateRef<any>;

  dims: ViewDimensions;
  scaleType: ScaleType;
  xDomain: any[];
  xSet: any[]; // the set of all values on the X Axis
  yDomain: [number, number];
  seriesDomain: any;
  xScale: any;
  yScale: any;
  transform: string;
  clipPathId: string;
  clipPath: string;
  colors: ColorHelper;
  margin: number[] = [10, 20, 10, 20];
  hoveredVertical: any; // the value of the x axis that is hovered over
  xAxisHeight: number = 0;
  yAxisWidth: number = 0;
  filteredDomain: any;
  legendOptions: any;

  timelineWidth: number;
  timelineHeight: number = 50;
  timelineXScale: any;
  timelineYScale: any;
  timelineXDomain: any;
  timelineTransform: any;
  timelinePadding: number = 10;

  brushInitialized: boolean = false;
  filterId: any;
  filter: any;
  brush: any;
  timeScale: any;
  originalXDomain: any;
  lastScrollTop: number = 0;
  brushEnd: boolean = true;

  seriesType = SeriesType;

  update(): void {
    super.update();

    this.dims = calculateViewDimensions({
      width: this.width,
      height: this.height,
      margins: this.margin,
      showXAxis: this.xAxis,
      showYAxis: this.yAxis,
      xAxisHeight: this.xAxisHeight,
      yAxisWidth: this.yAxisWidth,
      showXLabel: this.showXAxisLabel,
      showYLabel: this.showYAxisLabel,
      showLegend: this.legend,
      legendType: this.schemeType,
      legendPosition: this.legendPosition
    });

    if (this.panning == 'timeline') {
      this.dims.height -= this.timelineHeight + this.margin[2] + this.timelinePadding;
    }

    this.xDomain = this.getXDomain();
    if (this.filteredDomain) {
      this.xDomain = this.filteredDomain;
    }
    else {
      this.originalXDomain = this.xDomain;
    }

    this.yDomain = this.getYDomain();
    this.seriesDomain = this.getSeriesDomain();

    this.xScale = this.getXScale(this.xDomain, this.dims.width);
    this.yScale = this.getYScale(this.yDomain, this.dims.height);

    for (let i = 0; i < this.xSet.length; i++) {
      const val = this.xSet[i];
      let d0 = 0;
      for (const group of this.results) {
        let d = group.series.find(item => {
          let a = item.name;
          let b = val;
          if (this.scaleType === ScaleType.Time) {
            a = a.valueOf();
            b = b.valueOf();
          }
          return a === b;
        });

        if (d) {
          d.d0 = d0;
          d.d1 = d0 + d.value;
          d0 += d.value;
        } else {
          d = {
            name: val,
            value: 0,
            d0,
            d1: d0
          };
          group.series.push(d);
        }
      }
    }

    this.updateTimeline();

    this.setColors();
    this.legendOptions = this.getLegendOptions();

    this.transform = `translate(${this.dims.xOffset} , ${this.margin[0]})`;

    this.clipPathId = 'clip' + id().toString();
    this.clipPath = `url(#${this.clipPathId})`;

    if (this.panning == "onChart") {
      if (this.brush) {
        this.updateBrush();
      }

      this.filterId = 'filter' + id().toString();
      this.filter = `url(#${this.filterId})`;

      if (!this.brushInitialized) {
        this.addBrush();
        this.brushInitialized = true;
        setTimeout(() => {
          this.updateBrush();
        }, 0);
      }
    }
    else {
      this.brushInitialized = false;
    }
  }

  updateTimeline(): void {
    if (this.panning == 'timeline') {
      this.timelineWidth = this.dims.width;
      this.timelineXDomain = this.getXDomain();
      this.timelineXScale = this.getXScale(this.timelineXDomain, this.timelineWidth);
      this.timelineYScale = this.getYScale(this.yDomain, this.timelineHeight);
      this.timelineTransform = `translate(${this.dims.xOffset}, ${-this.margin[2]})`;
    }
  }

  getXDomain(): any[] {
    let values = getUniqueXDomainValues(this.results);

    this.scaleType = getScaleType(values);
    let domain = [];

    if (this.scaleType === ScaleType.Linear) {
      values = values.map(v => Number(v));
    }

    let min;
    let max;
    if (this.scaleType === ScaleType.Time || this.scaleType === ScaleType.Linear) {
      min = this.xScaleMin ? this.xScaleMin : Math.min(...values);

      max = this.xScaleMax ? this.xScaleMax : Math.max(...values);
    }

    if (this.scaleType === ScaleType.Time) {
      domain = [new Date(min), new Date(max)];
      this.xSet = [...values].sort((a, b) => {
        const aDate = a.getTime();
        const bDate = b.getTime();
        if (aDate > bDate) return 1;
        if (bDate > aDate) return -1;
        return 0;
      });
    } else if (this.scaleType === ScaleType.Linear) {
      domain = [min, max];
      // Use compare function to sort numbers numerically
      this.xSet = [...values].sort((a, b) => a - b);
    } else {
      domain = values;
      this.xSet = values;
    }

    return domain;
  }

  getYDomain(): [number, number] {
    const domain = [];

    for (let i = 0; i < this.xSet.length; i++) {
      const val = this.xSet[i];
      let sum = 0;
      for (const group of this.results) {
        const d = group.series.find(item => {
          let a = item.name;
          let b = val;
          if (this.scaleType === ScaleType.Time) {
            a = a.valueOf();
            b = b.valueOf();
          }
          return a === b;
        });

        if (d) {
          sum += d.value;
        }
      }

      domain.push(sum);
    }

    const min = this.yScaleMin ? this.yScaleMin : Math.min(0, ...domain);

    const max = this.yScaleMax ? this.yScaleMax : Math.max(...domain);
    return [min, max];
  }

  getSeriesDomain(): string[] {
    return this.results.map(d => d.name);
  }

  getXScale(domain, width: number): any {
    let scale;

    if (this.scaleType === ScaleType.Time) {
      scale = scaleTime();
    } else if (this.scaleType === ScaleType.Linear) {
      scale = scaleLinear();
    } else if (this.scaleType === ScaleType.Ordinal) {
      scale = scalePoint().padding(0.1);
    }

    scale.range([0, width]).domain(domain);

    return this.roundDomains ? scale.nice() : scale;
  }

  getYScale(domain, height: number): any {
    const scale = scaleLinear().range([height, 0]).domain(domain);
    return this.roundDomains ? scale.nice() : scale;
  }

  updateDomain(domain): void {
    this.filteredDomain = domain;
    this.xDomain = this.filteredDomain;
    this.xScale = this.getXScale(this.xDomain, this.dims.width);

    if (this.panning == 'onChart') {
      select(this.chartElement.nativeElement).select('.brush').call(this.brush.move, null);
    }

    let curRange, originalRange;
    if (this.xDomain[0] instanceof Date) {
      curRange = this.filteredDomain[1].getTime() - this.filteredDomain[0].getTime();
      originalRange = this.originalXDomain[1].getTime() - this.originalXDomain[0].getTime();
    }
    else {
      curRange = this.filteredDomain[1] - this.filteredDomain[0];
      originalRange = this.originalXDomain[1] - this.originalXDomain[0];
    }
    if (curRange < originalRange / 100) return;
  }

  addBrush(): void {
    const height = this.height;
    const width = this.width;

    this.brush = brushX()
      .extent([
        [0, 0],
        [width, height]
      ])
      .on('start', () => {
        this.tooltipArea.hideTooltip();
        this.brushEnd = false;
      })
      .on('end', ({ selection }) => {
        this.brushEnd = true;
        if (!selection) return;
        const newSelection = selection || this.xScale.range();
        const newDomain = newSelection.map(this.xScale.invert);

        this.onFilter.emit(newDomain);
        this.cd.markForCheck();

        this.updateDomain(newDomain);
      });
      
    select(this.chartElement.nativeElement).select('.brush').call(this.brush);

    select(this.chartElement.nativeElement).select('.timeline').on('click', () => {
      this.onFilter.emit(this.originalXDomain);
      this.updateDomain(this.originalXDomain);
    });

    select('body').on('keydown', (e) => {
      if (e.code == "ArrowLeft" || e.code == "ArrowRight") {
        this.tooltipArea.hideTooltip();
        this.hideCircles();
      }
      if (this.xDomain[0] instanceof Date) {
        if (e.code == "ArrowLeft") {
          const diff = Math.min((this.xDomain[1].getTime() - this.xDomain[0].getTime()) / 100, this.xDomain[0].getTime() - this.originalXDomain[0].getTime());
          this.xDomain[0] = new Date(this.xDomain[0].getTime() - diff);
          this.xDomain[1] = new Date(this.xDomain[1].getTime() - diff);
        }
        else if (e.code == "ArrowRight") {
          const diff = Math.min((this.xDomain[1].getTime() - this.xDomain[0].getTime()) / 100, this.originalXDomain[1].getTime() - this.xDomain[1].getTime());
          this.xDomain[0] = new Date(this.xDomain[0].getTime() + diff);
          this.xDomain[1] = new Date(this.xDomain[1].getTime() + diff);
        }
      }
      else if (typeof this.xDomain[0] == 'number') {
        if (e.code == "ArrowLeft") {
          const diff = Math.min((this.xDomain[1] - this.xDomain[0]) / 100, this.xDomain[0] - this.originalXDomain[0]);
          this.xDomain[0] = this.xDomain[0] - diff;
          this.xDomain[1] = this.xDomain[1] - diff;
        }
        else if (e.code == "ArrowRight") {
          const diff = Math.min((this.xDomain[1] - this.xDomain[0]) / 100, this.originalXDomain[1] - this.xDomain[1]);
          this.xDomain[0] = this.xDomain[0] + diff;
          this.xDomain[1] = this.xDomain[1] + diff;
        }
      }
      this.update();
    });
  }

  updateBrush(): void {
    if (!this.brush) return;
    const height = this.dims.height;
    const width = this.dims.width;

    this.brush.extent([
      [0, 0],
      [width, height]
    ]);

    select(this.chartElement.nativeElement).select('.brush').call(this.brush);

    // clear hardcoded properties so they can be defined by CSS
    select(this.chartElement.nativeElement)
      .select('.selection')
      .attr('fill', undefined)
      .attr('stroke', undefined)
      .attr('fill-opacity', undefined);
    this.cd.markForCheck();
  }

  mouseMove(event): void {
    this.tooltipArea.mouseMove(event);
  }

  mouseLeave(): void {
    this.tooltipArea.hideTooltip();
  }

  updateHoveredVertical(item) {
    this.hoveredVertical = item.value;
    this.deactivateAll();
  }

  @HostListener('mouseleave')
  hideCircles(): void {
    this.hoveredVertical = null;
    this.deactivateAll();
  }

  onClick(data, series?): void {
    if (series) {
      data.series = series.name;
    }

    this.select.emit(data);
  }

  trackBy(index, item): string {
    return `${item.name}`;
  }

  setColors(): void {
    let domain;
    if (this.schemeType === ScaleType.Ordinal) {
      domain = this.seriesDomain;
    } else {
      domain = this.yDomain;
    }

    this.colors = new ColorHelper(this.scheme, this.schemeType, domain, this.customColors);
  }

  getLegendOptions(): LegendOptions {
    const opts = {
      scaleType: this.schemeType as any,
      colors: undefined,
      domain: [],
      title: undefined,
      position: this.legendPosition
    };
    if (opts.scaleType === ScaleType.Ordinal) {
      opts.domain = this.seriesDomain;
      opts.colors = this.colors;
      opts.title = this.legendTitle;
    } else {
      opts.domain = this.yDomain;
      opts.colors = this.colors.scale;
    }
    return opts;
  }

  updateYAxisWidth({ width }: { width: number }): void {
    this.yAxisWidth = width;
    this.update();
  }

  updateXAxisHeight({ height }: { height: number }): void {
    this.xAxisHeight = height;
    this.update();
  }

  onActivate(item): void {
    const idx = this.activeEntries.findIndex(d => {
      return d.name === item.name && d.value === item.value;
    });
    if (idx > -1) {
      return;
    }

    this.activeEntries = [item, ...this.activeEntries];
    this.activate.emit({ value: item, entries: this.activeEntries });
  }

  onDeactivate(item): void {
    const idx = this.activeEntries.findIndex(d => {
      return d.name === item.name && d.value === item.value;
    });

    this.activeEntries.splice(idx, 1);
    this.activeEntries = [...this.activeEntries];

    this.deactivate.emit({ value: item, entries: this.activeEntries });
  }

  deactivateAll() {
    this.activeEntries = [...this.activeEntries];
    for (const entry of this.activeEntries) {
      this.deactivate.emit({ value: entry, entries: [] });
    }
    this.activeEntries = [];
  }
}
