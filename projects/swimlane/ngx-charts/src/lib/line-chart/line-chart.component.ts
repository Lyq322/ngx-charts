import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  HostListener,
  ChangeDetectionStrategy,
  ContentChild,
  ViewChild,
  TemplateRef,
  OnInit
} from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { scaleLinear, scaleTime, scalePoint } from 'd3-scale';
import { curveLinear } from 'd3-shape';

import { calculateViewDimensions } from '../common/view-dimensions.helper';
import { ColorHelper } from '../common/color.helper';
import { BaseChartComponent } from '../common/base-chart.component';
import { id } from '../utils/id';
import { getUniqueXDomainValues, getScaleType } from '../common/domain.helper';
import { LegendOptions, LegendPosition } from '../common/types/legend.model';
import { ScaleType } from '../common/types/scale-type.enum';
import { ViewDimensions } from '../common/types/view-dimension.interface';
import { isPlatformServer } from '@angular/common';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import { TooltipArea } from '../common/tooltip-area.component';

@Component({
  selector: 'ngx-charts-line-chart',
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
      <svg:g [attr.transform]="transform" class="line-chart chart">
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
          [referenceLines]="referenceLines"
          [showRefLines]="showRefLines"
          [showRefLabels]="showRefLabels"
          [wrapTicks]="wrapTicks"
          (dimensionsChanged)="updateYAxisWidth($event)"
        ></svg:g>
        <svg:g [attr.clip-path]="clipPath">
          <svg:g *ngIf="!isSSR">
            <svg:g *ngFor="let series of results; trackBy: trackBy" [@animationState]="'active'">
              <svg:g
                ngx-charts-line-series
                [xScale]="xScale"
                [yScale]="yScale"
                [colors]="colors"
                [data]="series"
                [activeEntries]="activeEntries"
                [scaleType]="scaleType"
                [curve]="curve"
                [rangeFillOpacity]="rangeFillOpacity"
                [hasRange]="hasRange"
                [animations]="animations"
              />
            </svg:g>
          </svg:g>
          <svg:g *ngIf="isSSR">
            <svg:g *ngFor="let series of results; trackBy: trackBy">
              <svg:g
                ngx-charts-line-series
                [xScale]="xScale"
                [yScale]="yScale"
                [colors]="colors"
                [data]="series"
                [activeEntries]="activeEntries"
                [scaleType]="scaleType"
                [curve]="curve"
                [rangeFillOpacity]="rangeFillOpacity"
                [hasRange]="hasRange"
                [animations]="animations"
              />
            </svg:g>
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
        [scaleType]="scaleType"
        [legend]="legend"
        (onDomainChange)="updateDomain($event)"
      >
        <svg:g *ngFor="let series of results; trackBy: trackBy">
          <svg:g
            ngx-charts-line-series
            [xScale]="timelineXScale"
            [yScale]="timelineYScale"
            [colors]="colors"
            [data]="series"
            [scaleType]="scaleType"
            [curve]="curve"
            [hasRange]="hasRange"
            [animations]="animations"
          />
        </svg:g>
      </svg:g>
      <svg:g [attr.transform]="transform" class="line-chart chart">
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

            <svg:g *ngFor="let series of results">
              <svg:g
                ngx-charts-circle-series
                [xScale]="xScale"
                [yScale]="yScale"
                [colors]="colors"
                [data]="series"
                [scaleType]="scaleType"
                [visibleValue]="hoveredVertical"
                [activeEntries]="activeEntries"
                [tooltipDisabled]="tooltipDisabled"
                [tooltipTemplate]="tooltipTemplate"
                [brushEnd]="brushEnd"
                (select)="onClick($event)"
                (activate)="onActivate($event)"
                (deactivate)="onDeactivate($event)"
              />
            </svg:g>
          </svg:g>
        </svg:g>
      </svg:g>
    </ngx-charts-chart>
  `,
  styleUrls: ['../common/base-chart.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('animationState', [
      transition(':leave', [
        style({
          opacity: 1
        }),
        animate(
          500,
          style({
            opacity: 0
          })
        )
      ])
    ])
  ]
})
export class LineChartComponent extends BaseChartComponent implements OnInit {
  @Input() legend: boolean;
  @Input() legendTitle: string = 'Legend';
  @Input() legendPosition: LegendPosition = LegendPosition.Right;
  @Input() xAxis: boolean;
  @Input() yAxis: boolean;
  @Input() showXAxisLabel: boolean;
  @Input() showYAxisLabel: boolean;
  @Input() xAxisLabel: string;
  @Input() yAxisLabel: string;
  @Input() autoScale: boolean;
  @Input() panning: string = "none";
  @Input() gradient: boolean;
  @Input() showGridLines: boolean = true;
  @Input() curve: any = curveLinear;
  @Input() activeEntries: any[] = [];
  @Input() schemeType: ScaleType;
  @Input() rangeFillOpacity: number;
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
  @Input() showRefLines: boolean = false;
  @Input() referenceLines: any;
  @Input() showRefLabels: boolean = true;
  @Input() xScaleMin: number;
  @Input() xScaleMax: number;
  @Input() yScaleMin: number;
  @Input() yScaleMax: number;
  @Input() wrapTicks = false;

  @Output() onFilter = new EventEmitter();
  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ContentChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;
  @ContentChild('seriesTooltipTemplate') seriesTooltipTemplate: TemplateRef<any>;
  @ViewChild(TooltipArea) tooltipArea:TooltipArea;

  dims: ViewDimensions;
  xSet: any;
  xDomain: any;
  yDomain: [number, number];
  seriesDomain: any;
  yScale: any;
  xScale: any;
  colors: ColorHelper;
  scaleType: ScaleType;
  transform: string;
  clipPath: string;
  clipPathId: string;
  areaPath: any;
  margin: number[] = [10, 20, 10, 20];
  hoveredVertical: any; // the value of the x axis that is hovered over
  xAxisHeight: number = 0;
  yAxisWidth: number = 0;
  filteredDomain: any;
  legendOptions: any;
  hasRange: boolean; // whether the line has a min-max range around it
  timelineWidth: any;
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
  isSSR = false;
  brushEnd: boolean = true;

  ngOnInit() {
    if (isPlatformServer(this.platformId)) {
      this.isSSR = true;
    }
  }

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

    if (this.panning == "timeline") {
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
    if (this.panning == "timeline") {
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
    for (const results of this.results) {
      for (const d of results.series) {
        if (domain.indexOf(d.value) < 0) {
          domain.push(d.value);
        }
        if (d.min !== undefined) {
          this.hasRange = true;
          if (domain.indexOf(d.min) < 0) {
            domain.push(d.min);
          }
        }
        if (d.max !== undefined) {
          this.hasRange = true;
          if (domain.indexOf(d.max) < 0) {
            domain.push(d.max);
          }
        }
      }
    }

    const values = [...domain];
    if (!this.autoScale) {
      values.push(0);
    }

    const min = this.yScaleMin ? this.yScaleMin : Math.min(...values);

    const max = this.yScaleMax ? this.yScaleMax : Math.max(...values);

    return [min, max];
  }

  getSeriesDomain(): string[] {
    return this.results.map(d => d.name);
  }

  getXScale(domain, width: number): any {
    let scale;

    if (this.scaleType === ScaleType.Time) {
      scale = scaleTime().range([0, width]).domain(domain);
    } else if (this.scaleType === ScaleType.Linear) {
      scale = scaleLinear().range([0, width]).domain(domain);

      if (this.roundDomains) {
        scale = scale.nice();
      }
    } else if (this.scaleType === ScaleType.Ordinal) {
      scale = scalePoint().range([0, width]).padding(0.1).domain(domain);
    }

    return scale;
  }

  getYScale(domain, height: number): any {
    const scale = scaleLinear().range([height, 0]).domain(domain);

    return this.roundDomains ? scale.nice() : scale;
  }

  updateDomain(domain): void {
    this.filteredDomain = domain;
    this.xDomain = this.filteredDomain;
    
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

    this.xScale = this.getXScale(this.xDomain, this.dims.width);
  }

  updateHoveredVertical(item): void {
    this.hoveredVertical = item.value;
    this.deactivateAll();
  }

  @HostListener('mouseleave')
  hideCircles(): void {
    this.hoveredVertical = null;
    this.deactivateAll();
  }

  onClick(data): void {
    this.select.emit(data);
  }

  trackBy(index: number, item): string {
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
    this.deactivateAll();

    const idx = this.activeEntries.findIndex(d => {
      return d.name === item.name && d.value === item.value;
    });
    if (idx > -1) {
      return;
    }

    this.activeEntries = [item];
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

  deactivateAll(): void {
    this.activeEntries = [...this.activeEntries];
    for (const entry of this.activeEntries) {
      this.deactivate.emit({ value: entry, entries: [] });
    }
    this.activeEntries = [];
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

    console.log("add brush", document.querySelector('.brush'));
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
      if (this.scaleType == ScaleType.Time) {
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
      else if (this.scaleType == ScaleType.Linear) {
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

    console.log("update brush", document.querySelector('.brush'));
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
}
