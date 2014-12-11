/*
 * Copyright (c) 2011, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
 
 /*
  * This is a simple jQuery-based app that uses the Force.com REST API.
  * See example.page for code required to run this in Visualforce
  * See example.html for code required to run this on your own server
  */

  function logout(e) {
  	e.preventDefault();

  	window.location.href = 'https://login.salesforce.com/secur/logout.jsp';
  }
  
  function errorCallback(jqXHR){
      $dialog.dialog('option', 'title', 'Error');
      $dialog.dialog('option', 'modal', true);
      $dialog.html(TrimPath.processDOMTemplate("error_jst", jqXHR));
      $dialog.find('#ok').click(function(e) {
          e.preventDefault();
          $dialog.dialog('close');
          logout(e);
      });
      $dialog.dialog('open');
  }

  function metadataCallback(response){
     // Using TrimPath Template for now - may switch to jQuery Template at some
     // point
 	$('#prompt').html(TrimPath.processDOMTemplate("prompt_jst"
 	    , response));

     // Set up autocomplete
     $( "#value" ).autocomplete({
         source: function( request, response ) {
             var query = "SELECT Id, Name FROM Account "+
                 "WHERE "+$("#field").val()+" LIKE '%"+request.term+"%' "+
                 "ORDER BY Name LIMIT 20";

             client.query(query, function( data ) {
                 response( $.map( data.records, function( record ) {
                     return {
                         label: record.Name,
                         value: record.Id
                     }
                 }));
             }, errorCallback);
         },
         minLength: 2,
         delay: 1000,
         select: function( event, ui ) {
             if ( ui.item != null ) {
                 showAccountDetail(ui.item.value);
             } else {
                 filterAccounts($("#field").val(),this.value);
             }

             return false;
         },
     });

 	$('#go').click(function(e) {
         var field = $("#field").val();
         var value = $("#value").val();

     	e.preventDefault();
 	    filterAccounts(field,value);
 	});

 	$('#new').click(function(e) {
     	e.preventDefault();

     	// Just make Trimpath happy
     	var dummy = {};
     	var i;
     	for (i = 0; i < response.fields.length; i++) {
     	    dummy[response.fields[i].name] = '';
     	}
         $dialog.html(TrimPath.processDOMTemplate("edit_jst", dummy));
         $dialog.find('#action').text('Create').click(function(e) {
             e.preventDefault();
             $dialog.dialog('close');

             var fields = {};
             $dialog.find('input').each(function() {
                 var child = $(this);
                 if ( child.val().length > 0 ) {
                     fields[child.attr("name")] = child.val();  
                 }               
             });

             $('#list').html(ajaxgif+" creating account...");

             client.create('Account', fields, createCallback, errorCallback);
         });
         $dialog.dialog('option', 'title', 'New Account');
         $dialog.dialog('open');
 	});

 	filterAccounts();
 }

 function queryCallback(response) {
 	$('#list').html(TrimPath.processDOMTemplate("accounts_jst"
 	    , response));

    $('#version').text($.fn.jquery);
    $('#uiversion').text($.ui.version);

 	$("#list tr:nth-child(odd)").addClass("odd");

 	$('#logout').click(logout);

 	$('#accounts').find('.id')
 	    .hover(function() {
              $(this).addClass("highlighted");
            },function(){
              $(this).removeClass("highlighted");
         })
         .click(function(){
             showAccountDetail(this.id);
         });
 }

 // Make our own startsWith utility fn
 String.prototype.startsWith = function(str){
     return (this.substr(0, str.length) === str);
 }

 function detailCallback(response) {
     if (response.Website != null
     && !response.Website.startsWith('http://')) {
         response.Website = 'http://'+response.Website;
     }
     $dialog.TrimPath.processDOMTemplate("detail_jst"
         ,response));
     $dialog.find('#industry').click(function(e) {
         e.preventDefault();
         $dialog.dialog('close');
         filterIndustry($(this).text());
     });
     $dialog.find('#delete').click(function(e) {
         e.preventDefault();
         $dialog.dialog('close');
         $('#list').html(ajaxgif+" deleting account...");
         client.del('Account', $dialog.find('#id').val(), deleteCallback, errorCallback);
     });
     $dialog.find('#edit').click(function(e) {
         e.preventDefault();
         $dialog.html(TrimPath.processDOMTemplate("edit_jst"
             ,response));
         $dialog.find('#action').text('Update').click(function(e) {
             e.preventDefault();
             $dialog.dialog('close');

             var fields = {};
             $dialog.find('input').each(function() {
                 var child = $(this);
                 if ( child.val().length > 0 && child.attr("name") != 'id') {
                     fields[child.attr("name")] = child.val();  
                 }               
             });

             $('#list').html(ajaxgif+" updating account...");

             client.update('Account', $dialog.find('#id').val(), fields, updateCallback, errorCallback);
         });
     });
 }

 function createCallback(response) {
 	$('#list').text('Created '+response.id);

 	setTimeout("filterAccounts()",1000);
 }

 function updateCallback(response) {
 	$('#list').text('Updated');

 	setTimeout("filterAccounts()",1000);
 }

 function deleteCallback(response) {
 	$('#list').text('Deleted');

 	setTimeout("filterAccounts()",1000);
 }

 function showAccountDetail(id) {
     // Show the dialog
     $dialog.dialog('option', 'title', 'Account Detail');
     $dialog.dialog('open');
     $dialog.html(ajaxgif+" retrieving...");

     // Get account details and populate the dialog
     client.retrieve('Account', id, 'Name,Industry,TickerSymbol,Website'
         , detailCallback, errorCallback);
 }

 function filterIndustry(industry) {
     $('#list').html(ajaxgif+" loading data...");

     var query = "SELECT Id, Name FROM Account WHERE Industry = '"+industry
     +"' ORDER BY Name LIMIT 20";

     client.query(query, queryCallback, errorCallback);
 }

 function filterAccounts(field, value) {
     $('#list').html(ajaxgif+" loading data...");

     var query = ( typeof value !== 'undefined' && value.length > 0 ) 
         ? "SELECT Id, Name FROM Account WHERE "+field+" LIKE '%"+value
         +"%' ORDER BY Name LIMIT 20"
         : "SELECT Id, Name FROM Account ORDER BY Name LIMIT 20";

     client.query(query, queryCallback, errorCallback);
 }
 