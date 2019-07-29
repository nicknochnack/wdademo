/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Header, Grid, Input, Checkbox, Image, Button } from 'semantic-ui-react';
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';
const utils = require('../../lib/utils');
/**
 * This object renders a search field at the top of the web page,
 * along with optional search parameter check boxes.
 * This object must determine when the user has entered a new
 * search value or toggled any of the check boxes and then propogate 
 * the event to the parent.
 */
export default class SearchField extends React.Component {
  constructor(...props) {
    super(...props);
    this.state = {
      searchQuery: this.props.searchQuery || '',
      queryType: this.props.queryType || utils.QUERY_NATURAL_LANGUAGE,
      // returnPassages: this.props.returnPassages || false,
      limitResults: this.props.limitResults || false,
      micToggle: false,
      model: 'en-US_BroadbandModel',
      rawMessages: [],
      formattedMessages: [],
      audioSource: null,
      speakerLabels: true,
      error:null
    }

    this.stopTranscription = this.stopTranscription.bind(this);
    this.handleStream = this.handleStream.bind(this);
    this.handleRawMessage = this.handleRawMessage.bind(this);
    this.handleTranscriptEnd = this.handleTranscriptEnd.bind(this);
    this.getRecognizeOptions = this.getRecognizeOptions.bind(this);
    this.handleFormattedMessage = this.handleFormattedMessage.bind(this);
    this.getFinalResults = this.getFinalResults.bind(this);
    this.getCurrentInterimResult = this.getCurrentInterimResult.bind(this);
  };

  stopTranscription() {
    if (this.stream) {
      this.stream.stop();
      // this.stream.removeAllListeners();
      // this.stream.recognizeStream.removeAllListeners();
    }
    this.setState({ audioSource: null });
  }

  /**
   * handleKeyPress - user has entered a new search value. 
   * Pass on to the parent object.
   */
  handleKeyPress(event) {
    this.setState({searchQuery: event.target.value});
    if (event.key === 'Enter') {
      this.props.onSearchQueryChange({
        searchQuery: this.state.searchQuery
      });
    }
  }
  
  handleClick(){
    this.props.onSearchQueryChange({
      searchQuery: this.state.searchQuery
    });  
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
          // .on('error', this.handleError());

    stream.recognizeStream.on('end', () => {
      if (this.state.error) {
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
    const { formattedMessages } = this.state;
    console.log("message",msg);
    this.setState({ formattedMessages: formattedMessages.concat(msg) });
    if(formattedMessages && formattedMessages.length > 0){
      this.setState({searchQuery: formattedMessages[formattedMessages.length - 1].results[0].alternatives[0].transcript});
      // this.setState({searchQuery: formattedMessages.concat(msg)[formattedMessages.length - 1].results[0].alternatives[0].transcript});
    }
  }

  handleRawMessage(msg) {
    const { rawMessages } = this.state;
    this.setState({ rawMessages: rawMessages.concat(msg) });
  }

  handleTranscriptEnd() {
    this.setState({ audioSource: null });
  }

  fetchToken(){
    return fetch('/api/credentials')
    .then((res)=>{
      if(res.status !== 200){
        throw new Error('Error retrieving auth token');
      }
      return res.json();
    })
    .then((creds) => {
      console.log(creds);
      this.setState({accessToken: creds.accessToken, serviceUrl: creds.serviceUrl})
    })
    .catch(this.handleError);
  }

  getRecognizeOptions(extra){
    return Object.assign({
      access_token: this.state.accessToken,
      token: this.state.accessToken,
      smart_formatting: true,
      format: true,
      model: this.state.model,
      objectMode: true,
      interim_results: true,
      // speaker_labels: this.state.speakerLabels,
      // resultsBySpeaker: this.state.speakerLabels,
      // speakerlessInterim: this.state.speakerLabels,
      url: this.state.serviceUrl
    }, extra)
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

  /**
   * toggleCheckbox - user has toggled one of the check boxes. 
   * Pass on to the parent object.
   */
  toggleCheckbox(value) {
    // let parent handle setting the new event, then
    // we just listen for state changes from parent
    // before we re-render.
    this.props.onSearchParamsChange({
      label: value
    });
  }

  // Important - this is needed to ensure changes to main properties
  // are propagated down to our component. In this case, we have passed
  // the checkbox changes to our parent to manage, so we just wait
  // for the changes to our state to get propogated down to us.

  componentDidMount(){
    this.fetchToken();
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ queryType: nextProps.queryType });
//    this.setState({ returnPassages: nextProps.returnPassages });
    this.setState({ limitResults: nextProps.limitResults });
  }

  /**
   * render - return the input field to render.
   */ 
  render() {
    const { queryType, limitResults} = this.state;
    var {micToggle, searchQuery} = this.state;
//    var micQuery = this.getFinalAndInterimResults().map((e)=>{return e.results[0].alternatives[0].transcript}).reduce((a,b)=>(a.concat(b),[]));
    return (
      <Grid className='search-field-grid'>
        <Grid.Column width={3} textAlign='center' verticalAlign='middle'>
          <Image as='a' href='/' src='/images/logo.png' size='small' centered={true}/>
        </Grid.Column>
        <Grid.Column width={7} textAlign='left'>
          <Header as='h1' style={{color: '#fff'}}>
            Data and AI RFI Helper
          </Header>
          <Input
            className='searchinput'
            placeholder='Enter your question...'
            onKeyUp={this.handleKeyPress.bind(this)}
            onChange={this.handleKeyPress.bind(this)}
            value={this.state.searchQuery}
            action>  
            <input />
            <Button icon='search' color='grey' onClick={()=>{this.handleClick()}}></Button>
            </Input>
        </Grid.Column>  
        <Grid.Column width={6} verticalAlign='top' textAlign='left'>
          <Grid.Row>
            <Checkbox 
              label='Natural Language Query' 
              checked={ queryType === utils.QUERY_NATURAL_LANGUAGE }
              onChange={this.toggleCheckbox.bind(this, 'queryType')}
              className='search-checkbox'
            />
          </Grid.Row>
          {/* <Grid.Row>
            <Checkbox 
              label='Passage Search'  
              checked={ returnPassages }
              onChange={this.toggleCheckbox.bind(this, 'returnPassages')}
            />
          </Grid.Row> */}
          {/* <Grid.Row >
            <Checkbox 
              label='Limit to 100 Results'
              checked={ limitResults }
              onChange={this.toggleCheckbox.bind(this, 'limitResults')}
              className='search-checkbox'
            />
          </Grid.Row> */}
        </Grid.Column>
      </Grid>
    );
  }
}

// type check to ensure we are called correctly
SearchField.propTypes = {
  onSearchQueryChange: PropTypes.func.isRequired,
  onSearchParamsChange: PropTypes.func.isRequired,
  searchQuery: PropTypes.string,
  queryType: PropTypes.number,
  // returnPassages: PropTypes.bool,
  limitResults: PropTypes.bool
};
