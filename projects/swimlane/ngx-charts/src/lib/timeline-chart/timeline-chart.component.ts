import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ContentChild,
  TemplateRef
} from '@angular/core';
import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';

import { calculateViewDimensions } from '../common/view-dimensions.helper';
import { ColorHelper } from '../common/color.helper';
import { BaseChartComponent } from '../common/base-chart.component';
import { TimelineChartType } from './types/timeline-chart-type.enum';
import { LegendOptions, LegendPosition } from '../common/types/legend.model';
import { ScaleType } from '../common/types/scale-type.enum';
import { ViewDimensions } from '../common/types/view-dimension.interface';
import { getScaleType } from '../common/domain.helper';

@Component({
  selector: 'ngx-charts-timeline-chart',
  template: `
    <ngx-charts-chart
      [view]="[width, height]"
      [showLegend]="legend"
      [legendOptions]="legendOptions"
      [activeEntries]="activeEntries"
      [animations]="animations"
      (legendLabelClick)="onClick($event)"
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
          [wrapTicks]="wrapTicks"
          (dimensionsChanged)="updateXAxisHeight($event)"
        ></svg:g>
        <svg:g
          ngx-charts-y-axis
          *ngIf="yAxis"
          [yScale]="yScale"
          [dims]="dims"
          [showLabel]="showYAxisLabel"
          [labelText]="yAxisLabel"
          [trimTicks]="trimYAxisTicks"
          [maxTickLength]="maxYAxisTickLength"
          [tickFormatting]="yAxisTickFormatting"
          [ticks]="yAxisTicks"
          [yAxisOffset]="dataLabelMaxWidth.negative"
          [wrapTicks]="wrapTicks"
          (dimensionsChanged)="updateYAxisWidth($event)"
        ></svg:g>
        <svg:g
          ngx-charts-timeline-series
          [type]="TimelineChartType.Standard"
          [xScale]="xScale"
          [yScale]="yScale"
          [colors]="colors"
          [series]="timelineData"
          [dims]="dims"
          [gradient]="gradient"
          [tooltipDisabled]="tooltipDisabled"
          [tooltipTemplate]="tooltipTemplate"
          [activeEntries]="activeEntries"
          [roundEdges]="roundEdges"
          [animations]="animations"
          [dataLabelFormatting]="dataLabelFormatting"
          [noBarWhenZero]="noBarWhenZero"
          (select)="onClick($event)"
          (dataLabelWidthChanged)="onDataLabelMaxWidthChanged($event)"
        />
      </svg:g>
    </ngx-charts-chart>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../common/base-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TimelineChartComponent extends BaseChartComponent {
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
  @Input() barPadding: number = 8;
  @Input() roundDomains: boolean = false;
  @Input() roundEdges: boolean = true;
  @Input() xScaleMax: number;
  @Input() xScaleMin: number;
  @Input() dataLabelFormatting: any;
  @Input() noBarWhenZero: boolean = true;
  @Input() wrapTicks = false;
  @Input() timelineData: any[];

  @Output() activate: EventEmitter<any> = new EventEmitter();
  @Output() deactivate: EventEmitter<any> = new EventEmitter();

  @ContentChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;

  dims: ViewDimensions;
  yScale: any;
  xScale: any;
  xDomain: any[];
  yDomain: string[];
  transform: string;
  colors: ColorHelper;
  margin: number[] = [10, 20, 10, 20];
  xAxisHeight: number = 0;
  yAxisWidth: number = 0;
  legendOptions: LegendOptions;
  dataLabelMaxWidth: any = { negative: 0, positive: 0 };
  scaleType: ScaleType;

  TimelineChartType = TimelineChartType;

  update(): void {
    super.update();

    this.margin = [10, 20 + this.dataLabelMaxWidth.positive, 10, 20 + this.dataLabelMaxWidth.negative];

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

    this.formatDates();

    this.xScale = this.getXScale();
    this.yScale = this.getYScale();

    this.setColors();
    this.legendOptions = this.getLegendOptions();

    this.transform = `translate(${this.dims.xOffset} , ${this.margin[0]})`;
  }

  getXScale(): any {
    this.xDomain = this.getXDomain();

    let scale;
    if (this.scaleType == ScaleType.Time) {
      scale = scaleTime().range([0, this.dims.width]).domain(this.xDomain);
    } else {
      scale = scaleLinear().range([0, this.dims.width]).domain(this.xDomain);
    }

    return this.roundDomains ? scale.nice() : scale;
  }

  getYScale(): any {
    this.yDomain = this.getYDomain();
    const spacing = this.yDomain.length / (this.dims.height / this.barPadding + 1);

    return scaleBand().rangeRound([0, this.dims.height]).paddingInner(spacing).domain(this.yDomain);
  }

  getXDomain(): any[] {
    const values = [];
    for (const d of this.timelineData) {
      values.push(d.startTime);
      values.push(d.endTime);
    }

    this.scaleType = getScaleType(values);

    const min = this.xScaleMin ? Math.min(this.xScaleMin, ...values) : Math.min(...values);
    const max = this.xScaleMax ? Math.max(this.xScaleMax, ...values) : Math.max(...values);

    if (this.scaleType == ScaleType.Time) {
      return [new Date(min), new Date(max)];
    } else {
      return [min, max];
    }
  }

  getYDomain(): string[] {
    return this.timelineData.map(d => d.name);
  }

  onClick(data): void {
    this.select.emit(data);
  }

  setColors(): void {
    let domain;
    if (this.schemeType === ScaleType.Ordinal) {
      domain = this.yDomain;
    } else {
      domain = this.xDomain;
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
    if (opts.scaleType === 'ordinal') {
      opts.domain = this.yDomain;
      opts.colors = this.colors;
      opts.title = this.legendTitle;
    } else {
      opts.domain = this.xDomain;
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

  onDataLabelMaxWidthChanged(event) {
    if (event.size.negative) {
      this.dataLabelMaxWidth.negative = Math.max(this.dataLabelMaxWidth.negative, event.size.width);
    } else {
      this.dataLabelMaxWidth.positive = Math.max(this.dataLabelMaxWidth.positive, event.size.width);
    }
    if (event.index === this.timelineData.length - 1) {
      setTimeout(() => this.update());
    }
  }

  /*onActivate(item, fromLegend: boolean = false) {
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
    if (idx > -1) {
      return;
    }

    this.activeEntries = [item, ...this.activeEntries];
    this.activate.emit({ value: item, entries: this.activeEntries });
  }

  onDeactivate(item, fromLegend: boolean = false) {
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
  }*/
}
