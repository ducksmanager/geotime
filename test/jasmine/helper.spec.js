var testHelperSteps;
var testButtonData;

var testValue;

describe('Helper tests', function() {
    var callbacks = null;

    beforeEach(function(){
        jasmine.getFixtures().fixturesPath = 'base';
        loadFixtures("placeholders/map.html");
        loadFixtures("placeholders/map-projection.html");

        callbacks = {
            myOnLoad: function() {
                testValue = 'loaded';
            },
            myOnUnload: function() {
                testValue+= 'unloaded';
            },
            dataUpdate: function () {
                return function (d) {
                    d.newData = 'myValue';
                    return d;
                };
            },
            clickOnSkipTest: function () { },
            clickOnDoneTest: function () { }
        };

        testHelperSteps = [{
            step: 1, content: ['Step 1 description', 'This is shown when the step is active'],
            onLoad: [callbacks.myOnLoad],
            onUnload: [callbacks.myOnUnload],
            dataUpdate: callbacks.dataUpdate,
            buttons: ['done', 'skip']
        },{
            step: 2, content: ['Step 2 description'],
            buttons: ['done']
        }];

        testButtonData = [
            { name: 'done',   cssClass: 'helperStepDone', text: 'Done !', click: callbacks.clickOnDoneTest },
            { name: 'skip',   cssClass: 'helperStepSkip', text: 'Skip', click: callbacks.clickOnSkipTest }
        ];

        helperButtonsData = testButtonData;
        testValue = null;
    });

    describe('Helper behaviour', function() {
        it('should load the helper', function() {
            initHelper('myMap.svg', testHelperSteps);

            expect(d3.select('#mapTitle').text()).toEqual('myMap.svg');
            expect(d3.select('#resizeHandle').classed('hidden')).toBeTruthy();
            expect(helperSteps.size()).toEqual(2);

            var firstStep = helperSteps.filter(function(d) { return d.step === 1; });
            var secondStep = helperSteps.filter(function(d) { return d.step === 2; });

            expect(firstStep.size()).toEqual(1);
            expect(firstStep.text()).toEqual('Step 1 descriptionThis is shown when the step is active');
            expect(firstStep.select('.if-active').text()).toEqual('This is shown when the step is active');

            expect(secondStep.size()).toEqual(1);
            expect(secondStep.text()).toEqual('Step 2 description');
            expect(secondStep.select('.if-active').text()).toEqual('');

            expect(testValue).toEqual(null);
        });

        it('should load a helper step', function() {
            initHelper('myMap.svg', testHelperSteps);

            expect(testValue).toEqual(null);
            activateHelperNextStep();
            expect(testValue).toEqual('loaded');

            var firstStep = helperSteps.filter(function(d) { return d.step === 1; });
            var secondStep = helperSteps.filter(function(d) { return d.step === 2; });

            expect(firstStep.classed('active')).toBeTruthy();
            var firstStepButtons = firstStep.selectAll('button:not(.hidden)');
            expect(firstStepButtons.size()).toEqual(2);
            expect(firstStepButtons.classed('helperStepDone')).toBeTruthy();
            expect(firstStepButtons.text()).toEqual('Done !');

            expect(secondStep.classed('active')).toBeFalsy();

            activateHelperNextStep();
            expect(testValue).toContain('unloaded');

            expect(firstStep.classed('active')).toBeFalsy();

            expect(secondStep.classed('active')).toBeTruthy();
            expect(secondStep.selectAll('button:not(.hidden)').size()).toEqual(1);
        });

        it('should execute an action on a button click', function() {
            initHelper('myMap.svg', testHelperSteps);
            activateHelperNextStep();

            var firstStep = helperSteps.filter(function(d) { return d.step === 1; });

            // Click on the 'done' button
            var doneButton = firstStep.selectAll('button').filter(function(d) { return d.name === 'done'; });

            spyOn(doneButton.datum(), 'click');
            doneButton.on('click')(doneButton.datum());

            expect(firstStep.datum().newData).toEqual('myValue');
            expect(doneButton.datum().click).toHaveBeenCalled();

            // Click on the 'skip' button. No data is updated
            var skipButton = firstStep.selectAll('button').filter(function(d) { return d.name === 'skip'; });

            spyOn(firstStep.datum(), 'dataUpdate');
            spyOn(skipButton.datum(), 'click');
            skipButton.on('click')(skipButton.datum());

            expect(firstStep.datum().dataUpdate).not.toHaveBeenCalled();
            expect(skipButton.datum().click).toHaveBeenCalled();
        });
    });
});