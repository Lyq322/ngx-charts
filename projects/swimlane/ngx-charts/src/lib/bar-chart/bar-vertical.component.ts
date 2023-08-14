import {
  Component,
  Input,
  ViewEncapsulation,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ContentChild,
  ViewChild,
  TemplateRef,
  ElementRef
} from '@angular/core';
import { scaleBand, scaleLinear } from 'd3-scale';

import { calculateViewDimensions } from '../common/view-dimensions.helper';
import { ColorHelper } from '../common/color.helper';
import { BaseChartComponent } from '../common/base-chart.component';
import { DataItem } from '../models/chart-data.model';
import { LegendOptions, LegendPosition } from '../common/types/legend.model';
import { ScaleType } from '../common/types/scale-type.enum';
import { ViewDimensions } from '../common/types/view-dimension.interface';
import { brushX } from 'd3-brush';
import { select } from 'd3-selection';
import { id } from '../utils/id';
import { TooltipDirective } from '../common/tooltip/tooltip.directive';
import { SeriesVerticalComponent } from './series-vertical.component';

@Component({
  selector: 'ngx-charts-bar-vertical',
  template: `
    <ngx-charts-chart
      [view]="[width, height]"
      [showLegend]="legend"
      [legendOptions]="legendOptions"
      [activeEntries]="activeEntries"
      [animations]="animations"
      (legendLabelClick)="onClick($event)"
      (legendLabelActivate)="onActivate($event, true)"
      (legendLabelDeactivate)="onDeactivate($event, true)"
    >
      <svg:g [attr.transform]="transform" class="bar-chart chart">
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
          [xAxisOffset]="dataLabelMaxHeight.negative"
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
        <svg:g
          ngx-charts-series-vertical
          [xScale]="xScale"
          [yScale]="yScale"
          [colors]="colors"
          [series]="filteredResults"
          [dims]="dims"
          [gradient]="gradient"
          [tooltipDisabled]="tooltipDisabled"
          [tooltipTemplate]="tooltipTemplate"
          [showDataLabel]="showDataLabel"
          [dataLabelFormatting]="dataLabelFormatting"
          [activeEntries]="activeEntries"
          [roundEdges]="roundEdges"
          [animations]="animations"
          [noBarWhenZero]="noBarWhenZero"
          (activate)="onActivate($event)"
          (deactivate)="onDeactivate($event)"
          (select)="onClick($event)"
          (dataLabelHeightChanged)="onDataLabelMaxHeightChanged($event)"
        ></svg:g>
      </svg:g>
      <svg:g
        ngx-charts-timeline
        *ngIf="panning == 'timeline'"
        [attr.transform]="timelineTransform"
        [results]="results"
        [view]="[timelineWidth, height]"
        [height]="timelineHeight"
        [scheme]="scheme"
        [customColors]="customColors"
        [legend]="legend"
        [isBar]="true"
        [barPadding]="barPadding"
        (onDomainChange)="updateDomain($event)"
      >
        <svg:g
          ngx-charts-series-vertical
          [xScale]="timelineXScale"
          [yScale]="timelineYScale"
          [colors]="colors"
          [series]="results"
          [dims]="dims"
          [tooltipDisabled]="true"
          [showDataLabel]="false"
          [roundEdges]="roundEdges"
          [noBarWhenZero]="noBarWhenZero"
        ></svg:g>
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
        ></svg:g>
      </svg:g>
    </ngx-charts-chart>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../common/base-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BarVerticalComponent extends BaseChartComponent {
  @Input() legend = false;
  @Input() legendTitle: string = 'Legend';
  @Input() legendPosition: LegendPosition = LegendPosition.Right;
  @Input() xAxis;
  @Input() yAxis;
  @Input() showXAxisLabel: boolean;
  @Input() showYAxisLabel: boolean;
  @Input() xAxisLabel: string;
  @Input() yAxisLabel: string;
  @Input() tooltipDisabled: boolean = false;
  @Input() gradient: boolean;
  @Input() showGridLines: boolean = true;
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
  @Input() barPadding = 8;
  @Input() roundDomains: boolean = false;
  @Input() roundEdges: boolean = true;
  @Input() yScaleMax: number;
  @Input() yScaleMin: number;
  @Input() showDataLabel: boolean = false;
  @Input() dataLabelFormatting: any;
  @Input() noBarWhenZero: boolean = true;
  @Input() wrapTicks = false;
  @Input() panning: string = "none";

  @Output() onFilter = new EventEmitter();
  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ContentChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;
  @ViewChild(TooltipDirective) tooltipDirective:TooltipDirective;
  @ViewChild(SeriesVerticalComponent) seriesVertical:SeriesVerticalComponent;

  dims: ViewDimensions;
  xScale: any;
  yScale: any;
  xDomain: any;
  yDomain: any;
  originalXDomain: any;
  transform: string;
  colors: ColorHelper;
  margin: number[] = [10, 20, 10, 20];
  xAxisHeight: number = 0;
  yAxisWidth: number = 0;
  legendOptions: LegendOptions;
  dataLabelMaxHeight: any = { negative: 0, positive: 0 };
  timelineWidth: any;
  timelineHeight: number = 50;
  timelineXScale: any;
  timelineYScale: any;
  timelineXDomain: any;
  timelineTransform: any;
  timelinePadding: number = 10;
  filteredDomain: any;
  filteredResults: any = this.results;

  brushInitialized: boolean = false;
  filterId: any;
  filter: any;
  brush: any;
  timeScale: any;
  panDisplay: boolean = true;
  brushing: boolean = false;
  showTooltip: boolean = false;

  update(): void {
    super.update();

    if (!this.showDataLabel) {
      this.dataLabelMaxHeight = { negative: 0, positive: 0 };
    }
    this.margin = [10 + this.dataLabelMaxHeight.positive, 20, 10 + this.dataLabelMaxHeight.negative, 20];

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

    this.formatDates();

    if (this.showDataLabel) {
      this.dims.height -= this.dataLabelMaxHeight.negative;
    }

    this.originalXDomain = this.getXDomain();
    this.xDomain = this.originalXDomain;
    if (this.filteredDomain) {
      this.xDomain = this.filteredDomain;
    }
    
    this.yDomain = this.getYDomain();

    this.xScale = this.getXScale(this.xDomain, this.dims.width);
    this.yScale = this.getYScale(this.yDomain, this.dims.height);

    this.updateTimeline();

    this.setColors();
    this.legendOptions = this.getLegendOptions();

    this.transform = `translate(${this.dims.xOffset} , ${this.margin[0] + this.dataLabelMaxHeight.negative})`;

    this.updateResult();;

    if (this.panning == "onChart") {
      if (this.brush) {
        this.updateBrush();
      }

      this.filterId = 'filter' + id().toString();
      this.filter = `url(#${this.filterId})`;

      if (!this.brushInitialized) {
        this.addBrush();
        this.addTooltip();
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
      this.timelineXDomain = this.originalXDomain;
      this.timelineXScale = this.getXScale(this.timelineXDomain, this.timelineWidth);
      this.timelineYScale = this.getYScale(this.yDomain, this.timelineHeight);
      this.timelineTransform = `translate(${this.dims.xOffset}, ${-this.margin[2]})`;
    }
  }

  updateResult(): void {
    if (this.panning != 'none') {
      this.filteredResults = this.xDomain.map(a => {
        for (const d of this.results) {
          if (d.name == a) {
            return d;
          }
        }
      });
    }
    else {
      this.filteredResults = this.results;
    }
  }

  getXScale(domain, width): any {
    const spacing = domain.length / (width / this.barPadding + 1);;
    return scaleBand().range([0, width]).paddingInner(spacing).domain(domain);
  }

  getYScale(domain, height): any {
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
    
    this.update();
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
        this.brushing = true;
      })
      .on('end', ({ selection }) => {
        this.brushing = false;
        if (!selection) return;
        const newSelection = selection || this.xScale.range();
        console.log(newSelection);

        let newDomain = [];
        const padding = this.xScale.step() * this.xScale.padding();
        const barWidth = this.xScale.step() - padding;

        const startIndex = Math.floor(((newSelection[0] + padding) / (barWidth + padding)));
        const endIndex = Math.floor((newSelection[1] / (barWidth + padding)));

        for (let i = startIndex; i <= endIndex; i++) {
          newDomain.push(this.xScale.domain()[i]);
        }

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

  addTooltip(): void {
    document.querySelector('.timeline').addEventListener('mousemove', (event: MouseEvent) => {
      if (this.brushing) return;
      const oldDisplay = (document.querySelector('.timeline') as HTMLElement).style.display;
      (document.querySelector('.timeline') as HTMLElement).style.display = 'none';
      const bar = document.elementFromPoint(event.clientX, event.clientY);
      //console.log(bar)
      if (bar) {
        if (bar.classList[0] == 'bar') {
          //console.log("show");
          this.showTooltip = true;
          this.seriesVertical.showTooltip();
        }
        else {
          //console.log("hide");
          this.showTooltip = false;
          this.seriesVertical.hideTooltip();
        }
      }
      (document.querySelector('.timeline') as HTMLElement).style.display = oldDisplay;
    })
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

  getXDomain(): any[] {
    return this.results.map(d => d.label);
  }

  getYDomain(): [number, number] {
    const values = this.results.map(d => d.value);

    let min = this.yScaleMin ? Math.min(this.yScaleMin, ...values) : Math.min(0, ...values);
    if (this.yAxisTicks && !this.yAxisTicks.some(isNaN)) {
      min = Math.min(min, ...this.yAxisTicks);
    }

    let max = this.yScaleMax ? Math.max(this.yScaleMax, ...values) : Math.max(0, ...values);
    if (this.yAxisTicks && !this.yAxisTicks.some(isNaN)) {
      max = Math.max(max, ...this.yAxisTicks);
    }
    return [min, max];
  }

  onClick(data: DataItem | string) {
    this.select.emit(data);
  }

  setColors(): void {
    let domain;
    if (this.schemeType === ScaleType.Ordinal) {
      domain = this.originalXDomain;
    } else {
      domain = this.yDomain;
    }

    this.colors = new ColorHelper(this.scheme, this.schemeType, domain, this.customColors);
  }

  getLegendOptions() {
    const opts = {
      scaleType: this.schemeType as any,
      colors: undefined,
      domain: [],
      title: undefined,
      position: this.legendPosition
    };
    if (opts.scaleType === ScaleType.Ordinal) {
      opts.domain = this.originalXDomain;
      opts.colors = this.colors;
      opts.title = this.legendTitle;
    } else {
      opts.domain = this.yDomain;
      opts.colors = this.colors.scale;
    }
    return opts;
  }

  updateYAxisWidth({ width }): void {
    this.yAxisWidth = width;
    this.update();
  }

  updateXAxisHeight({ height }): void {
    this.xAxisHeight = height;
    this.update();
  }

  onDataLabelMaxHeightChanged(event) {
    if (event.size.negative) {
      this.dataLabelMaxHeight.negative = Math.max(this.dataLabelMaxHeight.negative, event.size.height);
    } else {
      this.dataLabelMaxHeight.positive = Math.max(this.dataLabelMaxHeight.positive, event.size.height);
    }
    if (event.index === this.filteredResults.length - 1) {
      setTimeout(() => this.update());
    }
  }

  onActivate(item, fromLegend = false) {
    item = this.filteredResults.find(d => {
      if (fromLegend) {
        return d.label === item.name;
      } else {
        return d.name === item.name;
      }
    });

    const idx = this.activeEntries.findIndex(d => {
      return d.name === item.name && d.value === item.value && d.series === item.series;
    });
    if (idx > -1) {
      return;
    }

    this.activeEntries = [item, ...this.activeEntries];
    this.activate.emit({ value: item, entries: this.activeEntries });
  }

  onDeactivate(item, fromLegend = false) {
    item = this.results.find(d => {
      if (fromLegend) {
        return d.label === item.name;
      } else {
        return d.name === item.name;
      }
    });

    const idx = this.activeEntries.findIndex(d => {
      return d.name === item.name && d.value === item.value && d.series === item.series;
    });

    this.activeEntries.splice(idx, 1);
    this.activeEntries = [...this.activeEntries];

    this.deactivate.emit({ value: item, entries: this.activeEntries });
  }
}