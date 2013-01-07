Ext.Loader.setConfig({
	enabled: true,
	paths: {
		'Ext.ux': 'js/ux'
	}
});

Ext.require('Ext.ux.SpellCheck');
Ext.onReady(function() {		
	Ext.create('Ext.panel.Panel', {
		title: 'Notes',
		height: 200,
		width: 300,
		renderTo: Ext.getBody(),
		layout: 'fit',
		tbar: [{
			xtype: 'button',
			text: 'Check Spelling',
			listeners: {
				click: function(button) {
					Ext.create('Ext.window.Window', {
						title: 'Spell Check',
						autoShow: true,
						modal: true,
						height: 300,
						width: 300,
						layout: 'fit',
						items: [{
							xtype: 'spellcheck',
							border: false,
							checkField: button.up('panel').down('textarea'),
							saveAction: function(spellCheck, value) {
								spellCheck.up('window').close();
							},
							cancelAction: function(spellCheck, value) {
								spellCheck.up('window').close();
							}
						}]
					});
				}
			}
		}],
		items: [{
			xtype: 'textarea',
			value: 'Ths is a strign of txt with lots of typs in it.  ' + 
				'This string also has som typs in it.  Whoevr wrot this is very ' +
				'bad at speling.'
		}]
	});
});