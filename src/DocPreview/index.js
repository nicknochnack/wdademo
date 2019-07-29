import React from 'react';

class DocPreview extends React.Component{
	constructor(...props){
	super(...props);
	this.state = {
		selectedDocUrl: this.props.selectedDocUrl ? this.props.selectedDocUrl : 'https://www.ibm.com/support/customer/pdf/ica_se_english.pdf'
	}
}
	componentWillReceiveProps(nextProps){
		this.setState({ selectedDocUrl: nextProps.selectedDocUrl })
	}

	render() {
		return (<iframe src={this.state.selectedDocUrl} style={{width:'100%', height:'100%'}}></iframe>)
	}
}

module.exports = DocPreview;