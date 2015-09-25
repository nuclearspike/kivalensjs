import React from 'react/addons';
import Reflux from 'reflux'
import {loanActions} from '../actions'
import Highcharts from 'react-highcharts'
import {Row} from 'react-bootstrap';

//var timeoutHandle = null;
const ChartDistribution = React.createClass({
    mixins: [Reflux.ListenerMixin, React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {}
    },
    componentDidMount: function () {
        this.listenTo(loanActions.filter.completed, this.redoCharts)
        loanActions.filter()
    },
    produceChart: function(){
        var result;
        result = {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: 0,
                plotShadow: false,
                animation: false,
                margins: [0,0,0,0]
            },
            title: {
                text: name,
                align: 'center',
                verticalAlign: 'middle',
                y: 40
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            plotOptions: {
                pie: {
                    dataLabels: {
                        enabled: true,
                        distance: 10,
                        style: {
                            color: 'black'
                        }
                    },
                    startAngle: -90,
                    endAngle: 90,
                    center: ['50%', '75%']
                },
                series: {
                    animation: false
                }
            },
            credits: {enabled: false},
            series: [
                {
                    type: 'pie',
                    name: 'Countries',
                    center: ["10%", "50%"],
                    innerSize: '70%',
                    data: []
                },
                {
                    type: 'pie',
                    name: 'Sectors',
                    center: ["50%", "50%"],
                    innerSize: '70%',
                    data: []
                },
                {
                    type: 'pie',
                    name: 'Activities',
                    center: ["90%", "50%"],
                    innerSize: '70%',
                    data: []
                }]
        }
        return result;
    },
    redoCharts: function(loans){
        //console.log("Criteria.redoCharts()",loans)
        //clearTimeout(timeoutHandle);
        //timeoutHandle =setTimeout(()=>{
            console.log("Criteria.redoCharts():timeout()")
            let chart = this.refs.chart.getChart();
            var countryData  = loans.groupBy(l=>{return l.location.country}).map(g=>{return {name: g[0].location.country, y: g.length}})
            var sectorData   = loans.groupBy(l=>{return l.sector}).map(g=>{ return {name: g[0].sector, y: g.length}})
            var activityData = loans.groupBy(l=>{return l.activity}).map(g=>{return {name: g[0].activity, y: g.length}})
            chart.series[0].setData(countryData)
            chart.series[1].setData(sectorData)
            chart.series[2].setData(activityData)
        //}, 20)
    },
    render: function () {
        return (
            <Row style={{height:'200px'}} >
                <Highcharts style={{height: '200px'}} config={this.produceChart()} ref='chart' />
            </Row>
        );
    }
})

export default ChartDistribution