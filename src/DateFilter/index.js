import React from 'react';
import PropTypes from 'prop-types';
import {Button, Dropdown} from 'semantic-ui-react';

class DateFilter extends React.Component {
	constructor(...props){
		super(...props);
		this.state = {
			dateFilterFrom: this.props.selectedDateFrom,
			dateFilterTo: this.props.selectedDateTo
		}
	}
	
    handleChangeTo(e,select){
		this.setState({dateFilterTo: select.value})
	}

    handleChangeFrom(e,select){
		this.setState({dateFilterFrom: select.value})
	}
	
	applyDateFilter(e){
		this.props.onFilterItemsChange(this.state);
	}

	getDate(){
		let startDate = 2000;
		let finishDate = new Date().getFullYear();
		let dateRange = [];
		for(var i = finishDate;i >= startDate;--i){
			dateRange.push({key: i.toString(), text: i.toString(), value: i.toString()});
		}
		return dateRange;
	}

	componentWillReceiveProps(nextProps) {
		this.setState({ dateFilterFrom: nextProps.selectedDateFrom });
		this.setState({ dateFilterTo: nextProps.selectedDateTo });
	  }

	render() {
		return(<div style={{textAlign:'right'}}>
			<div style={{display:'flex',marginBottom:'10px'}}>
			<Dropdown placeholder='From' selection options={this.getDate()} value={this.state.dateFilterFrom} onChange={(e,s)=>this.handleChangeFrom(e,s)} style={{minWidth:'45%',marginRight:'10%'}}/>
			<Dropdown placeholder='To' selection options={this.getDate()} value={this.state.dateFilterTo} onChange={(e,s)=>this.handleChangeTo(e,s)} style={{minWidth:'45%'}}/>
			</div>
			<Button onClick={e => this.applyDateFilter(e)}>Apply</Button>
			</div>)
	}
}

DateFilter.propTypes = {
	dateFilterFrom: PropTypes.string,
	dateFilterTo: PropTypes.string
}

module.exports = DateFilter;