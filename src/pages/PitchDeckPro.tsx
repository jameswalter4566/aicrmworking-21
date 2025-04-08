
import React, { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PresentationChart, Download, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PitchDeckPro = () => {
  const [deckTitle, setDeckTitle] = useState<string>("My Mortgage Presentation");
  const [loanType, setLoanType] = useState<string>("conventional");
  const [slides, setSlides] = useState<string[]>([
    "Introduction",
    "Loan Options",
    "Current Rates",
    "Process Timeline",
    "Required Documents"
  ]);
  const [saving, setSaving] = useState<boolean>(false);

  const handleAddSlide = () => {
    setSlides([...slides, "New Slide"]);
  };

  const handleRemoveSlide = (index: number) => {
    const newSlides = [...slides];
    newSlides.splice(index, 1);
    setSlides(newSlides);
  };

  const handleUpdateSlide = (index: number, value: string) => {
    const newSlides = [...slides];
    newSlides[index] = value;
    setSlides(newSlides);
  };

  const handleSaveDeck = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Deck Saved",
        description: "Your pitch deck has been saved successfully.",
        duration: 3000,
      });
    }, 1000);
  };

  const handleGenerateDeck = () => {
    toast({
      title: "Generating Presentation",
      description: "Your pitch deck will be ready to download shortly.",
      duration: 3000,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <PresentationChart className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Pitch Deck Pro</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Create Your Mortgage Presentation</CardTitle>
            <CardDescription>
              Build a professional pitch deck for your mortgage clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="deck-title">Presentation Title</Label>
                <Input 
                  id="deck-title" 
                  value={deckTitle} 
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <RadioGroup 
                  value={loanType} 
                  onValueChange={setLoanType}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="conventional" id="conventional" />
                    <Label htmlFor="conventional">Conventional</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fha" id="fha" />
                    <Label htmlFor="fha">FHA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="va" id="va" />
                    <Label htmlFor="va">VA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jumbo" id="jumbo" />
                    <Label htmlFor="jumbo">Jumbo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="usda" id="usda" />
                    <Label htmlFor="usda">USDA</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Slide Content</Label>
                  <Button 
                    onClick={handleAddSlide} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slide
                  </Button>
                </div>
                <div className="space-y-4 mt-2">
                  {slides.map((slide, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor={`slide-${index}`}>Slide {index + 1}</Label>
                          <Button 
                            onClick={() => handleRemoveSlide(index)} 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea 
                          id={`slide-${index}`} 
                          value={slide}
                          onChange={(e) => handleUpdateSlide(index, e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={handleSaveDeck} 
                  variant="outline" 
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? "Saving..." : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleGenerateDeck} 
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Generate Presentation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Presentation Preview</CardTitle>
            <CardDescription>
              A preview of how your pitch deck will appear
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex justify-center items-center">
            <div className="text-center p-8 bg-gray-50 rounded-lg w-full">
              <PresentationChart className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">{deckTitle}</h3>
              <p className="text-gray-600 mb-4">Loan Type: {loanType.toUpperCase()}</p>
              <div className="flex flex-col items-center space-y-2">
                {slides.map((slide, index) => (
                  <div key={index} className="w-full max-w-sm py-2 px-4 bg-white rounded border text-left">
                    {slide}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PitchDeckPro;
