import React from 'react'
import {Image, Header, Input, Button} from 'semantic-ui-react'
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';

class HomeContent extends React.Component{
	constructor(...props){
		super(...props)
		this.state= {
			micToggle: false,
			model: 'en-US_BroadbandModel',
			rawMessages: [],
			formattedMessages: [],
			audioSource: null,
			speakerLabels: true,
			error:null,
			searchQuery: '', 
			loggedIn:'false'
		}

		this.stopTranscription = this.stopTranscription.bind(this);
		this.handleStream = this.handleStream.bind(this);
		this.handleRawMessage = this.handleRawMessage.bind(this);
		this.handleTranscriptEnd = this.handleTranscriptEnd.bind(this);
		this.getRecognizeOptions = this.getRecognizeOptions.bind(this);
		this.handleFormattedMessage = this.handleFormattedMessage.bind(this);
		this.getFinalResults = this.getFinalResults.bind(this);
		this.getCurrentInterimResult = this.getCurrentInterimResult.bind(this);	
	}

	componentDidMount(){
		this.fetchToken();
	  }
	
	handleSearch(e){
		//console.log("inside handleSearch : ",e.target.value);
		var keypress = e.key;
		this.setState({searchQuery: e.target.value},()=>{
			if(keypress === 'Enter' && this.state.searchQuery !==''){
				console.log("Enter pressed.. ");
				if(process.env.HOST_ENV=='dev'){
					window.location.replace('http://'+ window.location.hostname + ':' + process.env.PORT + '/'+ this.state.searchQuery);
				}
				else{
					window.location.replace('http://'+ window.location.hostname + '/'+ this.state.searchQuery);
				}
				
			}	
		})
	}


	handleClick(){
		if(this.state.searchQuery !==''){
			if(process.env.HOST_ENV=='dev'){
				window.location.replace('http://'+ window.location.hostname +':'+ process.env.PORT+'/'+ this.state.searchQuery);
			}else{
				window.location.replace('http://'+ window.location.hostname + '/'+ this.state.searchQuery);
			}
			
		}	
	}

	handleToggleMic(){
		if(!this.state.micToggle){
		  console.log("toggle on");
		  this.handleStream(recognizeMicrophone(this.getRecognizeOptions()));
		}else{
		  console.log("toggle off");
		  this.stopTranscription();
		}
		this.setState({micToggle: !this.state.micToggle})
	}
	
	handleStream(stream){
		if (this.stream) {
			this.stream.stop();
			this.stream.removeAllListeners();
			this.stream.recognizeStream.removeAllListeners();
		}

		this.stream = stream;

		stream.on('data', this.handleFormattedMessage)
				.on('end', this.handleTranscriptEnd)
				.on('error', (err)=>{console.log(err)});

		stream.recognizeStream.on('end', () => {
			if (this.state.error) {
				console.log(this.state.error);
			this.handleTranscriptEnd();
			}
		});

		stream.recognizeStream
		.on('message', (frame, json) => this.handleRawMessage({ sent: false, frame, json }))
		.on('send-json', json => this.handleRawMessage({ sent: true, json }))
		.once('send-data', () => this.handleRawMessage({
			sent: true, binary: true, data: true, // discard the binary data to avoid waisting memory
		}))
		.on('close', (code, message) => this.handleRawMessage({ close: true, code, message }));

	}

	handleFormattedMessage(msg) {
		//console.log("inside handleFormattedMessage : ",msg);
		const { formattedMessages } = this.state;
		console.log("message",msg);
		this.setState({ formattedMessages: formattedMessages.concat(msg) });
		if(formattedMessages && formattedMessages.length > 0){
			this.setState({searchQuery: formattedMessages[formattedMessages.length - 1].results[0].alternatives[0].transcript});
			// this.setState({searchQuery: formattedMessages.concat(msg)[formattedMessages.length - 1].results[0].alternatives[0].transcript});
		}
	}

	handleRawMessage(msg) {
		//console.log("inside handleRawMessage : ",msg);
		const { rawMessages } = this.state;
		this.setState({ rawMessages: rawMessages.concat(msg) });
	}
	

	handleTranscriptEnd() {
		this.setState({ audioSource: null });
	  }
	
	fetchToken(){
	//console.log("inside fetchToken : ");	
	return fetch('/api/credentials')
	.then((res)=>{
		if(res.status !== 200){
		throw new Error('Error retrieving auth token');
		}
		return res.json();
	})
	.then((creds) => {
		this.setState({accessToken: creds.accessToken, serviceUrl: creds.serviceUrl})
	})
	.catch(this.handleError);
	}

	getRecognizeOptions(extra){
	return Object.assign({
		access_token: this.state.accessToken,
		token: this.state.token,
		smart_formatting: true,
		format: true,
		model: this.state.model,
		objectMode: true,
		interim_results: true,
		// speaker_labels: this.state.speakerLabels,
		// resultsBySpeaker: this.state.speakerLabels,
		// speakerlessInterim: this.state.speakerLabels,
		url: this.state.serviceUrl
	})
	}

	getCurrentInterimResult() {
	const r = this.state.formattedMessages[this.state.formattedMessages.length - 1];

	// When resultsBySpeaker is enabled, each msg.results array may contain multiple results.
	// However, all results in a given message will be either final or interim, so just checking
	// the first one still works here.
	if (!r || !r.results || !r.results.length || r.results[0].final) {
		return null;
	}
	return r;
	}

	getFinalResults() {
		return this.state.formattedMessages.filter(r => r.results && r.results.length && r.results[0].final);
	}

	getFinalAndInterimResults(){
	const final = this.getFinalResults();
	const interim = this.getCurrentInterimResult();
	if (interim) {
		final.push(interim);
	}
	return final;
	}
	
	stopTranscription() {
		if (this.stream) {
		this.stream.stop();
		// this.stream.removeAllListeners();
		// this.stream.recognizeStream.removeAllListeners();
		}
		this.setState({ audioSource: null });
	}
	

	render(){
		var {micToggle} = this.state;
		return(
		<div style={{height:'100vh',width:'100vw',display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column', background:'#152935'}}>
		<Image src='/images/logo.png' size='small' centered/>
		<Header as='h1' inverted size='huge' style={{margin:'14px 0px'}}>Data and AI RFI Helper</Header>
		<Input as='a' onChange={this.handleSearch.bind(this)} onKeyUp={this.handleSearch.bind(this)} value={this.state.searchQuery} placeholder='Enter your question here...' style={{minWidth:'250px',width:'30%',paddingBottom:'50px'}} action>
			<input />
			<Button icon='search' color='grey' onClick={()=>{this.handleClick()}} />
		</Input>
		</div>)
	}
}
module.exports = HomeContent;
