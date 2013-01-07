/**
  * @class Ext.ux.SpellCheck
  * @author Danny Roessner                      
  * 
  * Client Side spell checking using the Typo.js spell checking library.
  * https://github.com/cfinke/Typo.js
  *
  * To Do: Replace All doesn't work in all cases.
  */
Ext.define('Ext.ux.SpellCheck', {
	extend: 'Ext.panel.Panel',
	requires: ['Ext.ux.form.MultiSelect'],
	alias: ['widget.spellcheck'],
	layout: {
		type: 'vbox',
		align: 'stretch'
	},
	bodyPadding: 5,
	/**
	 * The field to spell check.
	 */
	checkField: null,
	/**
	 * The path the dictionaries are located in.  Defaults to 'dictionaries'.
	 */
	dictionaryPath: 'dictionaries',
	/**
	 * The dictionary language to load. Defaults to 'en_US'.
	 */
	dictionaryLanguage: 'en_US',
	/**
	 * The platform the user is running on.
	 */
	platform: Ext.isChrome && chrome.extension ? 'chrome' : 'browser',
	initComponent: function() {
		var me = this,
			dictionary,
			value = me.checkField.getValue(),
			containsInvalid;

		Ext.ux.SpellCheckDictionary = Ext.ux.SpellCheckDictionary || {};
		if (!Ext.ux.SpellCheckDictionary[me.dictionaryLanguage]) {
			Ext.ux.SpellCheckDictionary[me.dictionaryLanguage] = new Typo(me.dictionaryLanguage, null, null, {
				platform: me.platform,
				dictionaryPath: me.dictionaryPath
			});
		}

		dictionary = Ext.ux.SpellCheckDictionary[me.dictionaryLanguage];

		me.originalValue = value;
		me.words = Ext.Array.clean(value.split(/[\s\n\r\t]/));
		me.isInvalid = [];
		me.ignoreWords = [];
		me.currentIndex = 0;
		me.newString = value;
		me.currentInvalid = -1;

		Ext.iterate(me.words, function(word, index) {
			var strippedWord = word.replace(/^[\.,;:\?!\(\)\{\}\[\]]/, '').replace(/[\.,;:\?!\(\)\{\}\[\]]$/, '');

			me.words[index] = strippedWord;
			me.isInvalid.push(dictionary.check(strippedWord) === false);
		});

		containsInvalid = Ext.Array.contains(me.isInvalid, true);
		me.autoShow = containsInvalid;

		me.items = [{
			xtype: 'panel',
			itemId: 'newString',
			autoScroll: true,
			flex: 1,
			bodyPadding: 3,
			margin: '0 0 5 0',
			html: value
		}, {
			xtype: 'container',
			layout: 'hbox',
			items: [{
				xtype: 'container',
				layout: 'anchor',
				defaults: {
					anchor: '100%'
				},
				flex: 1,
				items: [{
					xtype: 'displayfield',
					value: 'Replace with:'
				}, {
					xtype: 'textfield',
					itemId: 'replaceStringField'
				}, {
					xtype: 'displayfield',
					value: 'Suggestions:'
				},
				Ext.create('Ext.ux.form.MultiSelect', {
					itemId: 'suggestions',
					displayField: 'description',
					valueField: 'value',
					store: Ext.create('Ext.data.Store', {
						autoDestroy: true,
						fields: ['value', 'description']
					}),
					height: 101,
					listeners: {
						change: function(field, value) {
							me.down('#replaceStringField').setValue(value[0]);
						}
					}
				})]
			}, {
				xtype: 'component',
				width: 10
			}, {
				xtype: 'container',
				layout: 'vbox',
				defaults: {
					xtype: 'button',
					margin: '0 0 5 0',
					width: 100,
					listeners: {
						click: function(button) {
							me.doAction(button.text);
						}
					}
				},
				items: [{
					text: 'Ignore',
					disableIfDone: true
				}, {
					text: 'Ignore All',
					disableIfDone: true
				}, {
					text: 'Replace',
					disableIfDone: true
				}, {
					text: 'Replace All',
					disableIfDone: true
				}, {
					text: 'Save'
				}, {
					text: 'Cancel'
				}]
			}]
		}];

		me.callParent(arguments);

		if (containsInvalid) {
			me.on('afterrender', function() {
				me.findNextInvalid();
			});
		} else {
			Ext.Msg.alert('Complete', 'Spell Check completed.  No spelling mistakes found.');
			me.close();
		}
	},
	findNextInvalid: function() {
		var me = this,
			dictionary = Ext.ux.SpellCheckDictionary[me.dictionaryLanguage],
			suggestionField = me.down('#suggestions'),
			replaceStringField = me.down('#replaceStringField'),
			updatedValueField = me.down('#newString'),
			store = suggestionField.store,
			currentWord,
			suggestions,
			suggestRecords = [];

		me.currentInvalid += 1;
		currentWord = me.currentWord = me.words[me.currentInvalid];
		me.currentIndex = me.newString.indexOf(currentWord, me.currentIndex);
		if (me.currentInvalid > me.words.length - 1) {
			Ext.Msg.alert('Complete', 'Spell Check completed.');
			updatedValueField.update(me.newString);
			store.removeAll();
			Ext.iterate(me.query('button[disableIfDone]'), function(button) {
				button.disable();
			});

			suggestionField.disable();
			replaceStringField.setValue('').disable();
		} else {
			if (me.isInvalid[me.currentInvalid] && !Ext.Array.contains(me.ignoreWords, currentWord)) {
				store.removeAll();
				suggestions = dictionary.suggest(currentWord);
				Ext.iterate(suggestions, function(suggestion) {
					suggestRecords.push({
						value: suggestion,
						description: suggestion
					});
				});
				if (suggestRecords.length > 0) {
					store.add(suggestRecords);
					suggestionField.setValue(suggestions[0]);
					suggestionField.enable();
					replaceStringField.setValue(suggestions[0]);
				} else {
					store.add({
						value: '0',
						description: 'No suggestions found.'
					});
					suggestionField.disable();
					replaceStringField.setValue('');
				}
				updatedValueField.update(
					me.newString.substring(0, me.currentIndex) +
					'<span id="' + me.id + '-highlighted" class="spell-check-text">' +
						me.newString.substring(me.currentIndex, me.currentIndex + currentWord.length) +
					'</span>' +
					me.newString.substring(me.currentIndex + currentWord.length)
				);

				if (updatedValueField.body.isScrollable()) {
					Ext.fly(me.id + '-highlighted').scrollIntoView(updatedValueField.body);
				}
			} else {
				me.findNextInvalid();
			}
		}
	},
	doAction: function(action) {
		var me = this,
			newStringField = me.down('#newString'),
			index = me.currentIndex,
			value = me.newString,
			replaceRegex, updateCount = 0,
			newValue;

		if (action === 'Ignore') {
			me.findNextInvalid();
		} else if (action === 'Ignore All') {
			me.ignoreWords.push(me.words[me.currentInvalid]);
			me.findNextInvalid();
		} else if (action === 'Replace') {
			newValue = me.down('#replaceStringField').getValue();
			me.newString = value.substring(0, index) + newValue + value.substring(index + me.currentWord.length);
			me.words[me.currentInvalid] = newValue;
			newStringField.update(me.newString);
			me.currentIndex = me.currentIndex + (newValue.length - me.currentWord.length);
			me.findNextInvalid();
		} else if (action === 'Replace All') {
			newValue = me.down('#replaceStringField').getValue();
			replaceRegex = new RegExp('^' + me.currentWord, 'i');
			me.newString = me.newString.replace(replaceRegex, newValue);
			replaceRegex = new RegExp('[\\s\\n\\r\\t]' + me.currentWord + '[\\s\\n\\r\\t]', 'gi');
			me.newString = me.newString.replace(replaceRegex, ' ' + newValue + ' ');
			replaceRegex = new RegExp(me.currentWord + '$', 'i');
			me.newString = me.newString.replace(replaceRegex, newValue);
			Ext.iterate(me.words, function(word, index) {
				if (word === me.currentWord) {
					me.words[index] = newValue;
					me.isInvalid[index] = false;
					updateCount += 1;
				}
			});
			newStringField.update(me.newString);
			me.currentIndex = me.currentIndex + ((newValue.length - me.currentWord.length) * updateCount);
			me.findNextInvalid();
		} else if (action === 'Save') {
			me.checkField.setValue(me.newString);
			me.saveAction(me, me.newString);
		} else if (action === 'Cancel') {
			me.cancelAction(me, me.newString);
		}
	},
	/**
	 * The function to call after the save button is clicked
	 * @param {Ext.Component} this
	 * @param {String} value The new string value
	 */
	saveAction: Ext.emptyFn,
	/**
	 * The function to call after the cancel button is clicked
	 * @param {Ext.Component} this
	 * @param {String} value The new string value
	 */
	cancelAction: Ext.emptyFn
});