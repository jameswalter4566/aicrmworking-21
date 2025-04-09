import React, { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Presentation, 
  ImagePlus, 
  FileText, 
  Settings, 
  Plus, 
  ChevronRight, 
  Layout, 
  Home,
  Download,
  Share2,
  MessageSquare
} from "lucide-react";

const ListingPresentation = () => {
  const [activeTab, setActiveTab] = useState("property");
  
  const templates = [
    { id: 1, name: "Modern Minimalist", image: "/placeholder.svg" },
    { id: 2, name: "Luxury Estate", image: "/placeholder.svg" },
    { id: 3, name: "First-Time Buyer", image: "/placeholder.svg" },
    { id: 4, name: "Commercial Property", image: "/placeholder.svg" }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Presentation className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold">Listing Presentation Builder</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="template">Templates</TabsTrigger>
            <TabsTrigger value="property">Property Details</TabsTrigger>
            <TabsTrigger value="market">Market Analysis</TabsTrigger>
            <TabsTrigger value="photos">Photos & Media</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="template" className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Select a Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {templates.map(template => (
                <Card key={template.id} className={`cursor-pointer hover:border-green-500 transition-all ${template.id === 1 ? 'border-green-500 ring-2 ring-green-200' : ''}`}>
                  <CardContent className="p-0">
                    <img src={template.image} alt={template.name} className="w-full h-40 object-cover" />
                  </CardContent>
                  <CardFooter className="flex justify-between p-2">
                    <p className="text-sm font-medium">{template.name}</p>
                    {template.id === 1 && (
                      <div className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">Selected</div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button onClick={() => setActiveTab("property")} className="bg-green-600 hover:bg-green-700">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="property" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
                <CardDescription>Enter the details about the property you're listing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Property Address</Label>
                    <Input id="address" placeholder="123 Main Street" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Listing Price</Label>
                    <Input id="price" placeholder="$450,000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input id="bedrooms" type="number" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input id="bathrooms" type="number" placeholder="2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sqft">Square Footage</Label>
                    <Input id="sqft" placeholder="2,100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearBuilt">Year Built</Label>
                    <Input id="yearBuilt" placeholder="1998" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Property Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Enter a detailed description of the property..."
                    className="min-h-[120px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Key Features</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Renovated Kitchen', 'Hardwood Floors', 'Backyard', 'Garage', 'Pool', 'Fireplace'].map(feature => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox id={feature} />
                        <Label htmlFor={feature}>{feature}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("template")}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab("market")} className="bg-green-600 hover:bg-green-700">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="market" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Analysis</CardTitle>
                <CardDescription>Add comparable properties and market trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Comparable Properties</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                          <p className="font-medium">124 Main Street</p>
                          <p className="text-sm text-gray-500">Sold $445,000 | 3 bed, 2 bath</p>
                        </div>
                        <Button variant="outline" size="sm">Remove</Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                          <p className="font-medium">87 Oak Avenue</p>
                          <p className="text-sm text-gray-500">Sold $462,000 | 3 bed, 2.5 bath</p>
                        </div>
                        <Button variant="outline" size="sm">Remove</Button>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Add Comparable
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Neighborhood Data</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="avgDaysOnMarket">Avg. Days on Market</Label>
                        <Input id="avgDaysOnMarket" placeholder="26" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="medianPrice">Median Price</Label>
                        <Input id="medianPrice" placeholder="$455,000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priceChange">YoY Price Change</Label>
                        <Input id="priceChange" placeholder="4.2%" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inventory">Months of Inventory</Label>
                        <Input id="inventory" placeholder="2.4" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("property")}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab("photos")} className="bg-green-600 hover:bg-green-700">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="photos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Photos & Media</CardTitle>
                <CardDescription>Upload photos and add media to your presentation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                    <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-gray-500 mb-1">Drag and drop photos here</p>
                    <p className="text-gray-400 text-sm mb-4">or click to browse files</p>
                    <Button variant="outline">Choose Files</Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-2">
                      <img src="/placeholder.svg" alt="Property" className="w-full h-32 object-cover mb-2 rounded" />
                      <div className="flex justify-between">
                        <span className="text-sm">Front View</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">×</Button>
                      </div>
                    </div>
                    <div className="border rounded-md p-2">
                      <img src="/placeholder.svg" alt="Property" className="w-full h-32 object-cover mb-2 rounded" />
                      <div className="flex justify-between">
                        <span className="text-sm">Kitchen</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">×</Button>
                      </div>
                    </div>
                    <div className="border rounded-md p-2">
                      <img src="/placeholder.svg" alt="Property" className="w-full h-32 object-cover mb-2 rounded" />
                      <div className="flex justify-between">
                        <span className="text-sm">Living Room</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">×</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Additional Media</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" /> Add Virtual Tour
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" /> Add Floor Plan
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" /> Add Video Walkthrough
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("market")}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab("preview")} className="bg-green-600 hover:bg-green-700">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview & Export</CardTitle>
                <CardDescription>Review your presentation and export when ready</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 text-center">
                  <div className="bg-gray-100 p-8 mb-4 rounded-md flex flex-col items-center justify-center">
                    <Home className="h-16 w-16 text-green-600 mb-2" />
                    <h3 className="text-xl font-bold">123 Main Street</h3>
                    <p className="text-lg">$450,000</p>
                    <p className="text-sm text-gray-500">3 bed • 2 bath • 2,100 sq ft</p>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Your presentation includes 12 slides with property details, market analysis, and photos
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button variant="outline">
                      <Layout className="mr-2 h-4 w-4" /> Preview Slides
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Download className="mr-2 h-4 w-4" /> Export as PDF
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Share Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="justify-start">
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.282 0H1.718C.77 0 0 .77 0 1.718v20.564C0 23.23.77 24 1.718 24h20.564c.948 0 1.718-.77 1.718-1.718V1.718C24 .77 23.23 0 22.282 0zM7.173 20.435H3.587V8.869h3.586v11.566zM5.38 7.173a2.065 2.065 0 110-4.13 2.065 2.065 0 010 4.13zm15.055 13.262h-3.58v-5.657c0-1.338-.024-3.055-1.862-3.055-1.862 0-2.147 1.454-2.147 2.954v5.758H9.263V8.869h3.437v1.576h.048c.476-.902 1.638-1.856 3.38-1.856 3.608 0 4.277 2.375 4.277 5.456v6.391h.03z" fill="currentColor"></path>
                      </svg>
                      LinkedIn
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" fill="currentColor"></path>
                      </svg>
                      Twitter
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("photos")}>
                  Back
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                  Complete & Save
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ListingPresentation;
